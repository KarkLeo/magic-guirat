# Suggested Commands

## Установка и настройка

```bash
# Установка зависимостей
npm install

# Первый запуск после клонирования
npm install && npm run dev
```

## Разработка

```bash
# Запуск dev сервера с hot-reload
npm run dev

# Обычно доступен на http://localhost:5173
```

## Билд

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## Git

```bash
# Стандартные команды
git status
git add .
git commit -m "feat: описание изменений"
git push

# Просмотр логов
git log --oneline -10
```

## Полезные команды macOS/Darwin

```bash
# Навигация
ls -la          # список файлов с деталями
cd <dir>        # переход в директорию
pwd             # текущая директория

# Поиск файлов
find . -name "*.vue"           # поиск .vue файлов
grep -r "searchText" src/      # поиск текста в src/

# Процессы
ps aux | grep node             # поиск node процессов
lsof -i :5173                  # что использует порт 5173
kill -9 <PID>                  # убить процесс

# Системная информация
node --version                 # версия Node.js
npm --version                  # версия npm
```

## Тестирование (когда будет настроено)

```bash
# Пока нет тестов
# В будущем: npm run test, npm run test:unit, npm run test:e2e
```

## Линтинг/Форматирование (когда будет настроено)

```bash
# Пока нет eslint/prettier конфигов
# В будущем: npm run lint, npm run format
```

## Специфичные для проекта команды

```bash
# Очистка и переустановка зависимостей
rm -rf node_modules package-lock.json && npm install

# Проверка размера бандла
npm run build && du -sh dist/
```
