# Commit Workflow - Стандартный процесс коммита

## Этапы перед коммитом:

### 1️⃣ Ревью изменений
```bash
git status
git diff --stat
git diff <ключевые файлы> | head -100
```
- Проверить какие файлы изменены
- Понять суть изменений
- Прочитать ключевые файлы через Read tool

### 2️⃣ Type Check
```bash
npm run type-check
```
- Проверить TypeScript типы
- Убедиться что нет ошибок компиляции

### 3️⃣ Lint Check
```bash
npm run lint
```
- ESLint с auto-fix
- Исправить все warnings и errors
- Убрать неиспользуемые переменные

### 4️⃣ Build
```bash
npm run build
```
- Production сборка
- Проверить что нет критических ошибок
- (warning о chunk size > 500kb можно игнорировать)

### 5️⃣ Tests
```bash
npm run test:run
```
- Запустить все тесты
- Убедиться что все тесты проходят
- Vue warnings в тестах (onUnmounted вне компонента) можно игнорировать

## Если есть проблемы:
1. **Type errors** - исправить типы
2. **Lint errors** - удалить unused variables, исправить форматирование
3. **Build errors** - исправить импорты, синтаксис
4. **Test failures** - исправить логику, обновить тесты

## Если всё хорошо ✅:

### 6️⃣ Обновить документацию
- Обновить `MEMORY.md` (auto memory) через `mcp__serena__write_memory`
- Обновить `.memory/currentInput.md` если задача завершена
- Обновить `.memory/currentWork.md` если нужно
- Обновить `.memory/progress.md` если завершён sprint/task

### 7️⃣ Закоммитить ВСЁ
```bash
# Добавить ВСЕ измененные и новые файлы
git add <список всех файлов>

# Коммит с подробным сообщением
git commit -m "$(cat <<'EOF'
<type>: <краткое описание>

<подробное описание изменений>
- пункт 1
- пункт 2

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

### 8️⃣ Закоммитить документацию отдельно
```bash
git add .memory/
git commit -m "docs: update documentation for <feature>"
```

### 9️⃣ Финальная проверка
```bash
git log --oneline -5
git status
```

## Commit Message Conventions:
- `feat:` - новая функциональность
- `fix:` - исправление бага
- `refactor:` - рефакторинг кода
- `style:` - форматирование, стили
- `perf:` - оптимизация производительности
- `test:` - добавление/изменение тестов
- `docs:` - обновление документации
- `build:` - изменения в конфигурации сборки
- `chore:` - обновление зависимостей, рутинные задачи

## ВАЖНО:
✅ Всегда включать новые файлы в коммит
✅ Проверять что не коммитим лишние файлы (.env, node_modules, etc)
✅ Писать осмысленные commit messages
✅ Обновлять память после каждого значимого изменения
