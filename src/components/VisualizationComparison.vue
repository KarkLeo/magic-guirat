<template>
  <div class="comparison-page">
    <header class="header">
      <h1>🎸 INIT-3: Выбор библиотеки визуализации</h1>
      <p class="subtitle">Сравнение Canvas 2D API vs Three.js для Magic Guitar</p>
    </header>

    <div class="comparison-grid">
      <CanvasPOC />
      <ThreePOC />
    </div>

    <section class="analysis">
      <h2>📊 Анализ и выводы</h2>
      
      <div class="comparison-table">
        <table>
          <thead>
            <tr>
              <th>Критерий</th>
              <th>Canvas 2D API</th>
              <th>Three.js</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Производительность</strong></td>
              <td>✅ Отличная (60 FPS стабильно)</td>
              <td>✅ Отличная (60 FPS с WebGL)</td>
            </tr>
            <tr>
              <td><strong>Размер bundle</strong></td>
              <td>✅ ~0 KB (нативный API)</td>
              <td>⚠️ ~600 KB (Three.js library)</td>
            </tr>
            <tr>
              <td><strong>Простота API</strong></td>
              <td>✅ Простой и понятный</td>
              <td>⚠️ Сложнее, больше концепций</td>
            </tr>
            <tr>
              <td><strong>Магические эффекты</strong></td>
              <td>⚠️ Ограниченные (glow, градиенты)</td>
              <td>✅ Богатые (bloom, particles, 3D)</td>
            </tr>
            <tr>
              <td><strong>Glow/Bloom</strong></td>
              <td>⚠️ Ручная реализация через shadowBlur</td>
              <td>✅ Встроенные postprocessing эффекты</td>
            </tr>
            <tr>
              <td><strong>Частицы</strong></td>
              <td>⚠️ Требует ручной реализации</td>
              <td>✅ Готовые решения (Points, InstancedMesh)</td>
            </tr>
            <tr>
              <td><strong>3D возможности</strong></td>
              <td>❌ Только 2D</td>
              <td>✅ Полная 3D сцена</td>
            </tr>
            <tr>
              <td><strong>Кривая обучения</strong></td>
              <td>✅ Низкая</td>
              <td>⚠️ Средняя/Высокая</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="recommendation">
        <h3>🎯 Рекомендация</h3>
        <div class="recommendation-card">
          <h4>Выбираем: <span class="highlight">Three.js</span></h4>
          <p><strong>Обоснование:</strong></p>
          <ul>
            <li>
              <strong>Магическая визуализация требует богатых эффектов</strong> — bloom, particles, 
              glow эффекты критичны для создания "волшебной" атмосферы
            </li>
            <li>
              <strong>Готовые решения</strong> — Three.js предоставляет встроенные инструменты для 
              всех визуальных эффектов из требований
            </li>
            <li>
              <strong>Масштабируемость</strong> — легко добавить новые эффекты (trail, ripples, 3D elements)
            </li>
            <li>
              <strong>Размер приемлем</strong> — +600KB для веб-приложения с богатой визуализацией 
              это разумный trade-off
            </li>
            <li>
              <strong>Производительность</strong> — WebGL обеспечивает 60 FPS даже с сложными эффектами
            </li>
          </ul>

          <p class="note">
            <strong>Примечание:</strong> Canvas 2D отличный выбор для простых визуализаций, 
            но для "магического" эффекта с частицами, bloom и сложным свечением Three.js 
            предоставляет значительно больше возможностей из коробки.
          </p>
        </div>
      </div>

      <div class="next-steps">
        <h3>📝 Следующие шаги</h3>
        <ul>
          <li>✅ Three.js уже установлен (<code>npm install three</code>)</li>
          <li>🔄 Рассмотреть установку <code>@types/three</code> для TypeScript (опционально)</li>
          <li>🔄 Рассмотреть <code>postprocessing</code> для bloom эффектов (будущий спринт)</li>
          <li>➡️ Готовы к Sprint 1: AUDIO-1 и VIS-1</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup>
import CanvasPOC from './CanvasPOC.vue'
import ThreePOC from './ThreePOC.vue'
</script>

<style scoped>
.comparison-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  padding: 2rem;
  color: #e2e8f0;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  color: #94a3b8;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.analysis {
  max-width: 1200px;
  margin: 0 auto;
}

.analysis h2 {
  text-align: center;
  font-size: 2rem;
  color: #8b5cf6;
  margin-bottom: 2rem;
}

.comparison-table {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
}

tbody td {
  padding: 1rem;
  border-bottom: 1px solid #2d3748;
}

tbody tr:hover {
  background: #2d3748;
}

.recommendation {
  margin-bottom: 2rem;
}

.recommendation h3 {
  text-align: center;
  font-size: 1.8rem;
  color: #6366f1;
  margin-bottom: 1.5rem;
}

.recommendation-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d3748 100%);
  border: 2px solid #6366f1;
  border-radius: 12px;
  padding: 2rem;
}

.recommendation-card h4 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.highlight {
  color: #6366f1;
  font-weight: 700;
  text-decoration: underline;
}

.recommendation-card ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.recommendation-card li {
  margin: 0.75rem 0;
  line-height: 1.6;
}

.note {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #2d3748;
  border-left: 4px solid #8b5cf6;
  border-radius: 4px;
  font-size: 0.95rem;
}

.next-steps {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 2rem;
}

.next-steps h3 {
  color: #3b82f6;
  margin-bottom: 1rem;
}

.next-steps ul {
  list-style: none;
  padding: 0;
}

.next-steps li {
  margin: 0.75rem 0;
  font-size: 1.05rem;
}

code {
  background: #2d3748;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #8b5cf6;
}
</style>
