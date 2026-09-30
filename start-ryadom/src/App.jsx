import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { initMaxBridge, loadSavedOpportunities, saveSavedOpportunities, syncBackButton } from './maxBridge'

const opportunities = [
  { id: 1, title: 'Стажировка в продуктовой аналитике', company: 'VK Образование', type: 'Стажировка', direction: 'IT и аналитика', city: 'Казань', format: 'Гибрид', level: 'Без опыта', deadline: '18 октября', duration: '3 месяца', match: 94, skills: ['Excel', 'SQL', 'Аналитика'], reason: 'Подходит для старта без коммерческого опыта и сочетает аналитику с гибридным форматом.', nextStep: 'Заполнить короткую анкету и приложить учебный проект.' },
  { id: 2, title: 'Практика: интерфейсы для образования', company: 'Лаборатория городских сервисов', type: 'Практика', direction: 'Дизайн', city: 'Казань', format: 'Очно', level: 'Начальный', deadline: '24 октября', duration: '6 недель', match: 87, skills: ['Figma', 'UX-исследования', 'Прототипы'], reason: 'Можно начать с учебными кейсами и получить обратную связь от продуктовой команды.', nextStep: 'Подготовить один экран из учебного или личного проекта.' },
  { id: 3, title: 'Командный проект «Умный кампус»', company: 'Молодежный технопарк', type: 'Проект', direction: 'IT и аналитика', city: 'Любой город', format: 'Удаленно', level: 'Без опыта', deadline: '2 ноября', duration: '4 недели', match: 81, skills: ['Исследования', 'Презентации', 'Командная работа'], reason: 'Удаленный проект для первого опыта, где важнее интерес и готовность учиться.', nextStep: 'Выбрать роль в команде и пройти вводный мини-тест.' },
  { id: 4, title: 'Ассистент образовательных проектов', company: 'Центр развития молодежи', type: 'Волонтерство', direction: 'Гуманитарные науки', city: 'Казань', format: 'Гибрид', level: 'Без опыта', deadline: '30 октября', duration: '2 месяца', match: 76, skills: ['Коммуникация', 'Организация', 'Тексты'], reason: 'Помогает собрать первый опыт в проектах и познакомиться с образовательной средой.', nextStep: 'Рассказать о своих интересах в трех предложениях.' },
]

const initialProfile = { direction: 'IT и аналитика', city: 'Казань', format: 'Любой', experience: 'Без опыта' }

function App() {
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? window.location.origin : `http://${window.location.hostname}:3001`)
  const initialView = new URLSearchParams(window.location.search).get('view')
  const [step, setStep] = useState(() => ['welcome', 'profile', 'results', 'saved'].includes(initialView) ? initialView : 'welcome')
  const [catalog, setCatalog] = useState(opportunities)
  const [apiState, setApiState] = useState('local')
  const [maxContext] = useState(() => initMaxBridge())
  const [profile, setProfile] = useState(initialProfile)
  const [selectedId, setSelectedId] = useState(opportunities[0].id)
  const [saved, setSaved] = useState([])

  useEffect(() => {
    fetch(`${apiUrl}/api/opportunities`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
      .then((data) => { setCatalog(data.items); setApiState('connected') })
        .catch(() => setApiState('local'))
      }, [apiUrl])

      useEffect(() => {
        loadSavedOpportunities().then(setSaved)
      }, [])

      useEffect(() => {
        const canGoBack = step !== 'welcome'
        const previousStep = step === 'details' ? 'results' : step === 'profile' ? 'welcome' : 'welcome'
        return syncBackButton(canGoBack, () => setStep(previousStep))
      }, [step])

  const results = useMemo(() => catalog.map((item) => {
    let score = item.match
    if (profile.direction !== 'Любое' && item.direction !== profile.direction) score -= 12
    if (profile.city !== 'Любой город' && item.city !== profile.city && item.city !== 'Любой город') score -= 8
    if (profile.format !== 'Любой' && item.format !== profile.format) score -= 5
    if (profile.experience === 'Без опыта' && item.level === 'Без опыта') score += 5
    return { ...item, match: Math.max(54, Math.min(99, score)) }
  }).sort((a, b) => b.match - a.match), [catalog, profile])

  const selected = catalog.find((item) => item.id === selectedId) ?? results[0]
  function updateProfile(event) { const { name, value } = event.target; setProfile((current) => ({ ...current, [name]: value })) }
  function showDetails(id) { setSelectedId(id); setStep('details') }
  function toggleSaved(id) {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      saveSavedOpportunities(next).catch(() => {})
      return next
    })
    fetch(`${apiUrl}/api/saved`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId: id }) }).catch(() => {})
  }

  return (
    <div className="app-shell"><header className="topbar"><div className="brand-mark"><span>С</span> старт рядом</div><div className="topbar-meta"><span className="status-dot" /> {apiState === 'connected' ? 'API подключен' : 'локальные данные'} <span className="divider" /> {maxContext.embedded ? 'MAX mini-app' : 'browser preview'}</div></header><div className="workspace"><aside className="sidebar"><div className="sidebar-label">Навигация</div><button className={step === 'welcome' ? 'nav-item active' : 'nav-item'} onClick={() => setStep('welcome')}><span>01</span> Подбор</button><button className={step === 'results' || step === 'details' ? 'nav-item active' : 'nav-item'} onClick={() => setStep('results')}><span>02</span> Возможности <b>{results.length}</b></button><button className="nav-item" onClick={() => setStep('saved')}><span>03</span> Сохраненные <b>{saved.length}</b></button><div className="sidebar-note"><span className="note-pin">+</span><p>Твой первый опыт<br />начинается с одного<br /><strong>понятного шага.</strong></p></div><div className="sidebar-foot">Старт рядом <span>v0.1</span></div></aside><main className="main-content"><div className="breadcrumb">СТУДЕНТ 1–2 КУРСА <span>/</span> КАЗАНЬ <span>/</span> 2026</div>
      {step === 'welcome' && <section className="welcome-view page-enter"><div className="welcome-copy"><div className="eyebrow"><span className="eyebrow-line" /> персональный маршрут</div><h1>Найди место,<br /><em>с которого начнешь.</em></h1><p className="lead">Подберем практику, стажировку или проект под твои навыки и интересы. Без бесконечного поиска по разным сайтам.</p><button className="primary-button" onClick={() => setStep('profile')}>Начать подбор <span>→</span></button><div className="trust-line"><span>●</span> 20+ возможностей в демо-каталоге <i>·</i> данные обновлены 26.09.2026</div></div><div className="welcome-art" aria-label="Схема маршрута от профиля к первой возможности"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-card card-back"><small>ТВОЙ ПРОФИЛЬ</small><strong>Навыки<br /><b>→</b> интересы</strong></div><div className="art-card card-front"><small>СОВПАДЕНИЕ</small><strong>94<span>%</span></strong><p>аналитика · гибрид</p></div><div className="art-sticker">next<br />step</div></div></section>}
      {step === 'profile' && <section className="form-view page-enter"><div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> шаг 1 из 2</div><h2>Расскажи немного<br /><em>о своем направлении.</em></h2><p>Пять ответов, чтобы рекомендации были по делу. Их можно изменить в любой момент.</p></div><form className="profile-form" onSubmit={(event) => { event.preventDefault(); setStep('results') }}><label>Что изучаешь?<select name="direction" value={profile.direction} onChange={updateProfile}><option>IT и аналитика</option><option>Дизайн</option><option>Гуманитарные науки</option><option>Любое</option></select></label><label>Где ищешь?<select name="city" value={profile.city} onChange={updateProfile}><option>Казань</option><option>Москва</option><option>Любой город</option></select></label><label>Какой формат удобен?<select name="format" value={profile.format} onChange={updateProfile}><option>Любой</option><option>Удаленно</option><option>Гибрид</option><option>Очно</option></select></label><label>Опыт в профессии<select name="experience" value={profile.experience} onChange={updateProfile}><option>Без опыта</option><option>Есть учебные проекты</option><option>Есть коммерческий опыт</option></select></label><div className="form-footer"><span>Можно пропустить любой вопрос</span><button className="primary-button" type="submit">Показать варианты <span>→</span></button></div></form></section>}
      {step === 'results' && <section className="results-view page-enter"><div className="results-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> шаг 2 из 2</div><h2>Вот что нашлось<br /><em>для тебя.</em></h2></div><button className="text-button" onClick={() => setStep('profile')}>Изменить профиль ↗</button></div><div className="result-summary"><strong>{results.length} варианта</strong><span>на основе твоих ответов</span><span className="summary-profile">{profile.direction} <i>·</i> {profile.city} <i>·</i> {profile.format}</span></div><div className="opportunity-list">{results.map((item, index) => <article className={index === 0 ? 'opportunity-card featured' : 'opportunity-card'} key={item.id} onClick={() => showDetails(item.id)}><div className="card-index">0{index + 1}</div><div className="card-main"><div className="card-topline"><span className="type-label">{item.type}</span><span className="deadline">до {item.deadline}</span></div><h3>{item.title}</h3><p>{item.company} <span>·</span> {item.city} <span>·</span> {item.format}</p><div className="tag-row">{item.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div></div><div className="match-score"><strong>{item.match}%</strong><span>совпадение</span></div><button className="arrow-button" aria-label={`Открыть ${item.title}`}>↗</button></article>)}</div></section>}
      {step === 'details' && selected && <section className="details-view page-enter"><button className="back-button" onClick={() => setStep('results')}>← все возможности</button><div className="details-head"><div><span className="type-label">{selected.type}</span><h2>{selected.title}</h2><p className="company-line">{selected.company} <span>·</span> {selected.city} <span>·</span> {selected.format}</p></div><div className="big-match"><strong>{selected.match}%</strong><span>совпадение</span></div></div><div className="details-grid"><div><h4>Почему это подходит</h4><p className="reason">{selected.reason}</p><h4>Твои следующие шаги</h4><div className="checklist"><label><input type="checkbox" /> Посмотреть требования и сроки</label><label><input type="checkbox" /> Подготовить учебный проект</label><label><input type="checkbox" /> Отправить заявку до {selected.deadline}</label></div></div><aside className="detail-aside"><div><span>ДЕДЛАЙН</span><strong>{selected.deadline}</strong></div><div><span>ДЛИТЕЛЬНОСТЬ</span><strong>{selected.duration}</strong></div><button className={saved.includes(selected.id) ? 'save-button saved' : 'save-button'} onClick={() => toggleSaved(selected.id)}>{saved.includes(selected.id) ? '✓ Сохранено' : '+ Сохранить вариант'}</button></aside></div></section>}
      {step === 'saved' && <section className="empty-view page-enter"><div className="empty-mark">{saved.length ? '✦' : '03'}</div><div className="eyebrow"><span className="eyebrow-line" /> твои варианты</div><h2>{saved.length ? 'Сохраненное<br /><em>в одном месте.</em>' : 'Пока здесь<br /><em>пусто.</em>'}</h2><p>{saved.length ? `${saved.length} вариант сохранен. Вернись к нему, когда будешь готов сделать следующий шаг.` : 'Открой возможность из подборки и сохрани ее, чтобы вернуться позже.'}</p><button className="primary-button" onClick={() => setStep(saved.length ? 'details' : 'results')}>{saved.length ? 'Открыть сохраненное' : 'Посмотреть подборку'} <span>→</span></button></section>}</main><nav className="mobile-nav"><button className={step === 'welcome' || step === 'profile' ? 'selected' : ''} onClick={() => setStep('welcome')}><span>◼</span>Подбор</button><button className={step === 'results' || step === 'details' ? 'selected' : ''} onClick={() => setStep('results')}><span>◇</span>Возможности</button><button className={step === 'saved' ? 'selected' : ''} onClick={() => setStep('saved')}><span>▣</span>Сохраненные</button><button className="profile-nav" onClick={() => setStep('profile')}><span>●</span>Профиль</button></nav></div></div>
  )
}

export default App
