import os
import json
import logging
import asyncio
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise ValueError("BOT_TOKEN не задан в переменных окружения")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=TOKEN)
dp = Dispatcher(storage=MemoryStorage())

# Загрузка вопросов из файла
def load_questions():
    try:
        with open("questions.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("Файл questions.json не найден.")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Ошибка чтения JSON-файла: {e}")
        return []

QUESTIONS = load_questions()

# Определение состояний FSM
class QuizStates(StatesGroup):
    answering = State()           # Прохождение квиза
    waiting_for_contact = State() # Ожидание контактов (телефон/email)


# Функция-мок для отправки данных в Битрикс24
async def send_to_bitrix24(user_id: int, username: str, full_name: str, answers: list, contact: str) -> bool:
    """
    Мок-функция интеграции с CRM. Здесь вы можете реализовать отправку
    через входящий вебхук (например, с помощью httpx или aiohttp)
    или использовать REST API Битрикс24.
    """
    logger.info("--- [ОТПРАВКА В БИТРИКС24] ---")
    logger.info(f"ID пользователя TG: {user_id}")
    logger.info(f"Логин: @{username if username else 'N/A'}")
    logger.info(f"Имя: {full_name}")
    logger.info(f"Ответы на квиз: {json.dumps(answers, ensure_ascii=False)}")
    logger.info(f"Контакт для связи: {contact}")
    logger.info("-----------------------------")
    return True


# Вспомогательная функция отправки вопроса
async def send_question(message_or_callback, state: FSMContext, question_index: int):
    if question_index < len(QUESTIONS):
        question = QUESTIONS[question_index]
        
        # Строим инлайн-клавиатуру для выбора вариантов
        builder = InlineKeyboardBuilder()
        for opt_idx, option in enumerate(question["options"]):
            builder.button(
                text=option, 
                callback_data=f"ans_{question_index}_{opt_idx}"
            )
        builder.adjust(1) # Кнопки располагаются в один столбец

        text = f"Вопрос {question_index + 1} из {len(QUESTIONS)}:\n\n{question['text']}"

        if isinstance(message_or_callback, types.CallbackQuery):
            await message_or_callback.message.answer(text, reply_markup=builder.as_markup())
        else:
            await message_or_callback.answer(text, reply_markup=builder.as_markup())
    else:
        # Если вопросы закончились, переходим к сбору контактов
        await state.set_state(QuizStates.waiting_for_contact)
        
        # Предлагаем кнопку для быстрой отправки телефона
        kb_builder = ReplyKeyboardBuilder()
        kb_builder.button(text="📱 Поделиться контактом", request_contact=True)
        markup = kb_builder.as_markup(resize_keyboard=True, one_time_keyboard=True)
        
        contact_text = (
            "Спасибо за ваши ответы! 🎉\n"
            "Пожалуйста, оставьте ваш телефон или email, чтобы мы могли связаться с вами.\n\n"
            "Вы можете нажать на кнопку ниже, чтобы отправить свой контакт из профиля, "
            "или написать данные текстом вручную."
        )
        
        if isinstance(message_or_callback, types.CallbackQuery):
            await message_or_callback.message.answer(contact_text, reply_markup=markup)
        else:
            await message_or_callback.answer(contact_text, reply_markup=markup)


# Команда /start
@dp.message(Command("start"))
async def start_cmd(message: types.Message, state: FSMContext):
    if not QUESTIONS:
        await message.answer("Извините, сейчас опрос недоступен (список вопросов пуст).")
        return
    
    await state.clear()
    await state.update_data(current_index=0, answers=[])
    await state.set_state(QuizStates.answering)
    
    await message.answer("Приветствуем! Ответьте на несколько вопросов, чтобы мы подобрали лучшее решение.")
    await send_question(message, state, 0)


# Обработка ответов на вопросы квиза
@dp.callback_query(QuizStates.answering, F.data.startswith("ans_"))
async def handle_answer(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    current_index = data.get("current_index", 0)
    answers = data.get("answers", [])

    # Извлекаем индексы из callback_data
    parts = callback.data.split("_")
    q_idx = int(parts[1])
    opt_idx = int(parts[2])

    # Проверка, чтобы избежать повторных нажатий на старые сообщения
    if q_idx != current_index:
        await callback.answer()
        return

    # Сохраняем ответ пользователя
    question = QUESTIONS[current_index]
    selected_option = question["options"][opt_idx]
    answers.append({
        "question": question["text"],
        "answer": selected_option
    })

    # Обновляем состояние
    next_index = current_index + 1
    await state.update_data(answers=answers, current_index=next_index)
    
    # Убираем клавиатуру у старого сообщения
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(f"Ваш выбор: *{selected_option}*", parse_mode="Markdown")
    await callback.answer()

    # Задаем следующий вопрос
    await send_question(callback, state, next_index)


# Обработка некорректного текстового ввода во время опроса
@dp.message(QuizStates.answering)
async def warning_text_only(message: types.Message):
    await message.answer("Пожалуйста, выберите один из вариантов ответа с помощью кнопок.")


# Получение контактов (текст или объект Contact)
@dp.message(QuizStates.waiting_for_contact)
async def process_contact(message: types.Message, state: FSMContext):
    if message.contact:
        contact_info = message.contact.phone_number
    elif message.text:
        contact_info = message.text.strip()
    else:
        await message.answer("Пожалуйста, отправьте контакт по кнопке или напишите его в виде текста.")
        return

    data = await state.get_data()
    answers = data.get("answers", [])
    user = message.from_user

    # Отправка в CRM
    success = await send_to_bitrix24(
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        answers=answers,
        contact=contact_info
    )

    if success:
        await message.answer(
            "Спасибо за заявку! Ваши данные успешно сохранены. Менеджер свяжется с вами в ближайшее время.",
            reply_markup=types.ReplyKeyboardRemove()
        )
    else:
        await message.answer(
            "Произошла ошибка при регистрации заявки. Попробуйте еще раз позже.",
            reply_markup=types.ReplyKeyboardRemove()
        )

    # Очищаем состояние после успешного завершения квиза
    await state.clear()


async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())