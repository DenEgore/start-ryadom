import { Bot, Keyboard, session } from '@maxhub/max-bot-api'

const token = process.env.MAX_BOT_TOKEN
const miniAppUrl = process.env.MAX_MINIAPP_URL
const apiUrl = process.env.MAX_API_URL || 'https://platform-api.max.ru'

if (!token) throw new Error('MAX_BOT_TOKEN is required to start the bot')

const bot = new Bot(token, { clientOptions: { baseUrl: apiUrl } })
bot.use(session())

function keyboard(rows) {
  return { attachments: [Keyboard.inlineKeyboard(rows)] }
}

function appUrl(view = 'welcome') {
  if (!miniAppUrl) return null
  const url = new URL(miniAppUrl)
  if (view !== 'welcome') url.searchParams.set('view', view)
  return url.toString()
}

function welcomeKeyboard() {
  const rows = [
    [Keyboard.button.callback('Найти возможность', 'profile:start')],
    [Keyboard.button.callback('Каталог', 'catalog'), Keyboard.button.callback('Как это работает', 'info')],
    [Keyboard.button.callback('Мои сохраненные', 'saved')],
  ]
  const url = appUrl()
  if (url) rows.unshift([Keyboard.button.openApp('Открыть mini-app', url)])
  return keyboard(rows)
}

async function sendWelcome(ctx) {
  if (ctx.session.welcomeAt && Date.now() - ctx.session.welcomeAt < 3000) return
  ctx.session.welcomeAt = Date.now()
  await ctx.reply('СТАРТ РЯДОМ\n\nПомогу студенту 1–2 курса найти практику, стажировку или первый проект — и понять следующий шаг.\n\nВыбери действие ниже. Весь основной сценарий работает прямо в MAX.', welcomeKeyboard())
}

bot.command('start', sendWelcome)
bot.command('menu', sendWelcome)
bot.command('cancel', async (ctx) => {
  ctx.session.profile = undefined
  await sendWelcome(ctx)
})

bot.action('profile:start', async (ctx) => {
  ctx.session.profile = { step: 'direction' }
  await ctx.reply('Шаг 1 из 3\n\nЧто ты изучаешь?', keyboard([
    [Keyboard.button.callback('IT и аналитика', 'direction:it')],
    [Keyboard.button.callback('Дизайн', 'direction:design')],
    [Keyboard.button.callback('Гуманитарные науки', 'direction:humanities')],
  ]))
})

bot.action(/^direction:(.+)$/, async (ctx) => {
  ctx.session.profile = { ...ctx.session.profile, direction: ctx.match[1], step: 'city' }
  await ctx.reply('Шаг 2 из 3\n\nГде ищешь возможность?', keyboard([
    [Keyboard.button.callback('Казань', 'city:kazan'), Keyboard.button.callback('Москва', 'city:moscow')],
    [Keyboard.button.callback('Любой город', 'city:any')],
  ]))
})

bot.action(/^city:(.+)$/, async (ctx) => {
  ctx.session.profile = { ...ctx.session.profile, city: ctx.match[1], step: 'format' }
  await ctx.reply('Шаг 3 из 3\n\nКакой формат тебе подходит?', keyboard([
    [Keyboard.button.callback('Удаленно', 'format:remote'), Keyboard.button.callback('Гибрид', 'format:hybrid')],
    [Keyboard.button.callback('Очно', 'format:onsite'), Keyboard.button.callback('Любой', 'format:any')],
  ]))
})

bot.action(/^format:(.+)$/, async (ctx) => {
  ctx.session.profile = { ...ctx.session.profile, format: ctx.match[1], step: 'done' }
  const direction = ctx.session.profile.direction === 'design' ? 'дизайне' : ctx.session.profile.direction === 'humanities' ? 'образовательных проектах' : 'аналитике и IT'
  await ctx.reply(`Нашел 3 варианта для тебя.\n\n1. Стажировка в продуктовой аналитике\nVK Образование · гибрид · без опыта\n\n2. Командный проект «Умный кампус»\nМолодежный технопарк · удаленно\n\n3. Практика в образовательных интерфейсах\nЛаборатория городских сервисов · 6 недель\n\nПодбор собран по направлению ${direction}.`, keyboard([
    [Keyboard.button.callback('Подробнее о первом', 'opportunity:1')],
    [Keyboard.button.callback('Сохранить первый', 'save:1'), Keyboard.button.callback('Начать заново', 'profile:start')],
    [Keyboard.button.callback('В меню', 'menu')],
  ]))
})

bot.action('catalog', (ctx) => ctx.reply('КАТАЛОГ\n\nСтажировки, практики, командные проекты и образовательное волонтерство. Данные MVP синтетические и подходят для демонстрации сценария.', keyboard([
  [Keyboard.button.callback('Подобрать для меня', 'profile:start')],
  [Keyboard.button.callback('В меню', 'menu')],
])))

bot.action('info', (ctx) => ctx.reply('КАК ЭТО РАБОТАЕТ\n\n1. Ты отвечаешь на три коротких вопроса.\n2. Мы сопоставляем ответы с каталогом.\n3. Ты получаешь варианты и понятный следующий шаг.\n\nВ MVP используются тестовые данные.', keyboard([
  [Keyboard.button.callback('Начать подбор', 'profile:start')],
  [Keyboard.button.callback('В меню', 'menu')],
])))

bot.action('saved', (ctx) => ctx.reply('СОХРАНЕННЫЕ\n\nПока здесь нет сохраненных вариантов. Пройди подбор и сохрани первый проект.', keyboard([
  [Keyboard.button.callback('Начать подбор', 'profile:start')],
  [Keyboard.button.callback('В меню', 'menu')],
])))

bot.action('opportunity:1', (ctx) => ctx.reply('СТАЖИРОВКА В ПРОДУКТОВОЙ АНАЛИТИКЕ\n\nVK Образование · Казань · гибрид\nПодходит для старта без коммерческого опыта. Следующий шаг — приложить учебный проект.', keyboard([
  [Keyboard.button.callback('Сохранить', 'save:1')],
  [Keyboard.button.callback('Назад к вариантам', 'profile:start')],
])))

bot.action('save:1', (ctx) => ctx.reply('Сохранено. Следующий шаг — подготовить учебный проект и отправить заявку до 18 октября.', keyboard([
  [Keyboard.button.callback('В меню', 'menu'), Keyboard.button.callback('Новый подбор', 'profile:start')],
])))

bot.hears(/^(каталог|возможности)$/i, (ctx) => ctx.reply('Открой каталог или запусти персональный подбор.', keyboard([
  [Keyboard.button.callback('Каталог', 'catalog'), Keyboard.button.callback('Начать подбор', 'profile:start')],
])))

bot.hears(/^(профиль|сохраненные|мои варианты|о проекте)$/i, sendWelcome)
bot.on('message_created', async (ctx, next) => {
  const text = ctx.message?.body?.text?.trim()
  if (!text || text.startsWith('/')) return next()
  return sendWelcome(ctx)
})

bot.catch((error) => console.error('MAX bot error:', error))

async function main() {
  const botInfo = await bot.api.getMyInfo()
  bot.botInfo = botInfo
  console.log(`MAX bot connected: ${botInfo.name || botInfo.username || botInfo.user_id}`)
  await bot.startPolling({ retry: true })
}

main().catch((error) => {
  console.error('MAX bot startup failed:', error)
  process.exit(1)
})
