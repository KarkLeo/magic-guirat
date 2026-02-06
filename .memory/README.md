# .memory - Project Management System

Система управления проектом для совместной работы с Claude Code.

## Структура

```
.memory/
├── README.md           # Этот файл - описание системы
├── currentInput.md     # Твои идеи и текущая задача для Claude
├── currentWork.md      # Текущая работа Claude (автообновляется)
├── backlog.md          # Очередь задач
└── progress.md         # Архив завершенных задач
```

## Workflow

1. **Постановка задачи:**
   - Опиши задачу в `currentInput.md`
   - Claude читает и переносит в `currentWork.md`
   - Статус: `planning`

2. **Работа над задачей:**
   - Claude обновляет `currentWork.md` по ходу работы
   - Статусы: `planning` → `in-progress` → `review` → `testing` → `done`

3. **Завершение задачи:**
   - Когда статус `done`, Claude предлагает архивацию
   - Файл копируется в `history/YYYY-MM-DD-task-name.md`
   - `currentWork.md` очищается для новой задачи

4. **Планирование:**
   - Когда нужно трансформировать идеи в stories, скажи Claude
   - Claude заполнит `plan.md` в формате User Story

## Статусы

- **planning** - планирование подхода и шагов
- **in-progress** - активная работа над задачей
- **review** - проверка кода, рефакторинг
- **testing** - тестирование и проверка edge cases
- **done** - задача завершена, готова к архивации

## Автоматизация

Claude автоматически:
- ✅ Обновляет статус в `currentWork.md`
- ✅ Фиксирует прогресс и заметки
- ✅ Предлагает перенос в `progress.md` когда done
- ✅ Напоминает о тестировании

---

*Created: 2026-02-05*
