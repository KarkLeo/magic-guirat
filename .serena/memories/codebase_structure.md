# Codebase Structure

## Текущая структура

```
magic-guitar/
├── .git/                  # Git репозиторий
├── .memory/               # Система управления задачами
│   ├── README.md          # Описание workflow
│   ├── intro.md           # Изначальная идея проекта
│   ├── plan.md            # User Stories
│   ├── backlog.md         # Детальный беклог
│   ├── currentWork.md     # Текущая работа
│   └── history/           # Архив завершенных задач
├── .vscode/               # VS Code настройки
├── .idea/                 # IntelliJ IDEA настройки
├── public/                # Статические файлы
├── src/                   # Исходный код
│   ├── main.js            # Точка входа
│   ├── App.vue            # Корневой компонент
│   ├── assets/            # Ресурсы (css, images)
│   │   ├── main.css       # Главные стили
│   │   ├── base.css       # Базовые стили
│   │   └── logo.svg       # Лого
│   └── components/        # Vue компоненты
│       ├── HelloWorld.vue      # Демо компонент
│       ├── TheWelcome.vue      # Демо компонент
│       ├── WelcomeItem.vue     # Демо компонент
│       └── icons/              # Иконки (демо)
├── index.html             # HTML entry point
├── package.json           # NPM dependencies
├── vite.config.js         # Vite конфигурация
├── jsconfig.json          # JS конфигурация
├── .gitignore             # Git ignore rules
└── README.md              # Документация проекта
```

## Планируемая структура

После рефакторинга для Magic Guitar:

```
magic-guitar/
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── components/           # Vue компоненты
│   │   ├── guitar/           # Компоненты гитары
│   │   │   ├── GuitarVisualizer.vue
│   │   │   ├── GuitarString.vue
│   │   │   ├── GuitarFretboard.vue
│   │   │   └── ChordDisplay.vue
│   │   ├── audio/            # Аудио компоненты
│   │   │   ├── AudioCapture.vue
│   │   │   ├── AudioVisualizer.vue
│   │   │   └── VolumeIndicator.vue
│   │   ├── particles/        # Система частиц
│   │   │   └── ParticleSystem.vue
│   │   ├── ui/               # UI компоненты
│   │   │   ├── TheHeader.vue
│   │   │   ├── SettingsPanel.vue
│   │   │   └── ChordName.vue
│   │   └── common/           # Общие компоненты
│   │       ├── BaseButton.vue
│   │       └── BaseCard.vue
│   ├── composables/          # Composition API hooks
│   │   ├── useAudio.js       # Захват звука
│   │   ├── usePitchDetection.js
│   │   ├── useChordRecognition.js
│   │   └── useVisualizer.js
│   ├── services/             # Бизнес-логика
│   │   ├── audioService.js
│   │   ├── pitchDetectionService.js
│   │   ├── chordDatabase.js
│   │   └── visualizationService.js
│   ├── utils/                # Утилиты
│   │   ├── noteUtils.js      # Работа с нотами
│   │   ├── frequencyUtils.js
│   │   ├── colorUtils.js
│   │   └── mathUtils.js
│   ├── constants/            # Константы
│   │   ├── notes.js          # Ноты, струны
│   │   ├── chords.js         # Аккорды
│   │   └── colors.js         # Цветовая палитра
│   ├── assets/               # Ресурсы
│   │   ├── styles/           # Стили
│   │   │   ├── main.css
│   │   │   ├── variables.css # CSS переменные
│   │   │   └── animations.css
│   │   └── images/           # Изображения
│   └── data/                 # Данные
│       └── chords.json       # База аккордов
├── tests/                    # Тесты (в будущем)
│   ├── unit/
│   └── e2e/
└── docs/                     # Документация (в будущем)
```

## Ключевые файлы

### Конфигурация

- **vite.config.js** - Vite конфигурация, алиасы, плагины
- **package.json** - зависимости и скрипты
- **jsconfig.json** - JavaScript конфигурация для IDE

### Entry Points

- **index.html** - HTML точка входа
- **src/main.js** - JavaScript точка входа (создание Vue app)
- **src/App.vue** - Корневой Vue компонент

### Стили

- **src/assets/main.css** - Главный CSS файл
- **src/assets/base.css** - Базовые стили

## Алиасы

Настроен алиас `@` для `src/`:

```javascript
// Вместо
import Component from '../../../components/Component.vue'

// Используем
import Component from '@/components/Component.vue'
```

## Gitignore

Игнорируются:
- `node_modules/`
- `dist/`
- `.DS_Store` (macOS)
- IDE files
- `*.log`

## Node Modules

**Важно:** `node_modules/` НЕ установлены!  
Нужно выполнить: `npm install`

## Build Output

Production build создается в `dist/`:
```bash
npm run build  # создает dist/
```
