import http from 'node:http'

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '0.0.0.0'
const opportunities = [
  { id: 1, title: 'Стажировка в продуктовой аналитике', company: 'VK Образование', type: 'Стажировка', direction: 'IT и аналитика', city: 'Казань', format: 'Гибрид', level: 'Без опыта', deadline: '18 октября', duration: '3 месяца', skills: ['Excel', 'SQL', 'Аналитика'], reason: 'Подходит для старта без коммерческого опыта и сочетает аналитику с гибридным форматом.', sourceUrl: 'https://example.test/opportunities/1' },
  { id: 2, title: 'Практика: интерфейсы для образования', company: 'Лаборатория городских сервисов', type: 'Практика', direction: 'Дизайн', city: 'Казань', format: 'Очно', level: 'Начальный', deadline: '24 октября', duration: '6 недель', skills: ['Figma', 'UX-исследования', 'Прототипы'], reason: 'Можно начать с учебными кейсами и получить обратную связь от продуктовой команды.', sourceUrl: 'https://example.test/opportunities/2' },
  { id: 3, title: 'Командный проект «Умный кампус»', company: 'Молодежный технопарк', type: 'Проект', direction: 'IT и аналитика', city: 'Любой город', format: 'Удаленно', level: 'Без опыта', deadline: '2 ноября', duration: '4 недели', skills: ['Исследования', 'Презентации', 'Командная работа'], reason: 'Удаленный проект для первого опыта, где важнее интерес и готовность учиться.', sourceUrl: 'https://example.test/opportunities/3' },
  { id: 4, title: 'Ассистент образовательных проектов', company: 'Центр развития молодежи', type: 'Волонтерство', direction: 'Гуманитарные науки', city: 'Казань', format: 'Гибрид', level: 'Без опыта', deadline: '30 октября', duration: '2 месяца', skills: ['Коммуникация', 'Организация', 'Тексты'], reason: 'Помогает собрать первый опыт в проектах и познакомиться с образовательной средой.', sourceUrl: 'https://example.test/opportunities/4' },
]

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' })
  response.end(JSON.stringify(body))
}

function score(item, profile = {}) {
  let value = 50
  if (!profile.direction || profile.direction === 'Любое' || item.direction === profile.direction) value += 20
  if (!profile.city || profile.city === 'Любой город' || item.city === profile.city || item.city === 'Любой город') value += 12
  if (!profile.format || profile.format === 'Любой' || item.format === profile.format) value += 8
  if (profile.experience === 'Без опыта' && item.level === 'Без опыта') value += 10
  return Math.min(99, value)
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => resolve(body ? JSON.parse(body) : {}))
    request.on('error', reject)
  })
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {})
  const url = new URL(request.url, `http://${request.headers.host}`)
  const parts = url.pathname.split('/').filter(Boolean)

  if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { status: 'ok', service: 'start-ryadom-api' })
  if (request.method === 'GET' && url.pathname === '/api/opportunities') {
    const filtered = opportunities.filter((item) => (!url.searchParams.get('direction') || url.searchParams.get('direction') === 'Любое' || item.direction === url.searchParams.get('direction')) && (!url.searchParams.get('city') || url.searchParams.get('city') === 'Любой город' || item.city === url.searchParams.get('city') || item.city === 'Любой город') && (!url.searchParams.get('format') || url.searchParams.get('format') === 'Любой' || item.format === url.searchParams.get('format')))
    return json(response, 200, { items: filtered, total: filtered.length })
  }
  if (request.method === 'GET' && parts[0] === 'api' && parts[1] === 'opportunities' && parts[2]) {
    const item = opportunities.find((entry) => entry.id === Number(parts[2]))
    return item ? json(response, 200, item) : json(response, 404, { error: 'Opportunity not found' })
  }
  if (request.method === 'POST' && url.pathname === '/api/recommendations') {
    try {
      const profile = await readBody(request)
      const items = opportunities.map((item) => ({ ...item, match: score(item, profile) })).sort((a, b) => b.match - a.match)
      return json(response, 200, { items, profile })
    } catch { return json(response, 400, { error: 'Invalid JSON body' }) }
  }
  if (request.method === 'POST' && url.pathname === '/api/saved') {
    try { const body = await readBody(request); return json(response, 201, { saved: true, opportunityId: body.opportunityId }) } catch { return json(response, 400, { error: 'Invalid JSON body' }) }
  }
  return json(response, 404, { error: 'Route not found' })
})

server.listen(port, host, () => console.log(`Start Ryadom API listening on http://${host}:${port}`))
