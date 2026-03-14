/**
 * Основной модуль приложения
 * - загрузка и отображение списка подкастов из podcasts.json
 * - сортировка по дате (новые сверху)
 * - обработка кликов на выпуски
 * - поддержка deep link (#episode-{id})
 * - инициализация плеера
 */

document.addEventListener('DOMContentLoaded', () => {
    const player = new Player();
    const DURATION_CACHE_VERSION = 'v2';
    let episodes = [];

    // Элемент списка
    const episodesList = document.getElementById('episodesList');

    // Загрузка JSON
    fetch('podcasts.json')
        .then(response => response.json())
        .then(data => {
            // Сортировка по дате (новые сверху)
            episodes = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            renderEpisodes(episodes);
            initFromHashOrLast();
        })
        .catch(error => {
            console.error('Ошибка загрузки подкастов:', error);
            episodesList.innerHTML = '<p>Не удалось загрузить список выпусков</p>';
        });

    // Отрисовка списка выпусков
    function renderEpisodes(episodes) {
        episodesList.innerHTML = '';
        episodes.forEach(ep => {
            const item = document.createElement('div');
            item.className = 'episode-item';
            item.dataset.id = ep.id;
            item.innerHTML = `
                <div class="episode__icon"><i class="fas fa-podcast"></i></div>
                <div class="episode__info">
                    <div class="episode__title">${ep.title}</div>
                    <div class="episode__date">${formatDate(ep.date)}</div>
                    <div class="episode__duration" data-id="${ep.id}"><i class="far fa-clock"></i> ${ep.duration || '—'}</div>
                    <div class="episode__description">${ep.description}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                player.loadEpisode(ep);
                highlightActiveEpisode(ep.id);
                // Обновляем URL hash без перезагрузки
                window.location.hash = `episode-${ep.id}`;
            });
            episodesList.appendChild(item);
        });

        // После отрисовки списка пытаемся заполнить продолжительность выпусков
        initDurations(episodes);
    }

    // Форматирование даты
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // Форматирование продолжительности:
    // - до 1 часа: мм:сс
    // - 1 час и больше: ч:мм:сс
    function formatDuration(seconds) {
        if (isNaN(seconds) || seconds <= 0) return '—';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Инициализация продолжительностей выпусков
    function initDurations(episodes) {
        episodes.forEach(ep => {
            const durationEl = document.querySelector(`.episode__duration[data-id="${ep.id}"]`);
            if (!durationEl) return;

            // Если уже есть продолжительность в данных — не пересчитываем
            if (ep.duration) {
                durationEl.innerHTML = `<i class="far fa-clock"></i> ${ep.duration}`;
                return;
            }

            const audio = new Audio();
            audio.src = ep.audio;
            audio.addEventListener('loadedmetadata', () => {
                const text = formatDuration(audio.duration);
                if (text !== '—') {
                    localStorage.setItem(`episode_${ep.id}_duration_${DURATION_CACHE_VERSION}`, text);
                    durationEl.innerHTML = `<i class="far fa-clock"></i> ${text}`;
                }
            });
            audio.addEventListener('error', () => {
                // Если не удалось загрузить файл, оставляем дефолтное значение
            });
        });
    }

    // Подсветка активного выпуска
    function highlightActiveEpisode(id) {
        document.querySelectorAll('.episode-item').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.id == id) {
                el.classList.add('active');
            }
        });
    }

    // Инициализация: deep link или последний прослушанный
    function initFromHashOrLast() {
        const hash = window.location.hash.slice(1); // убираем #
        let episodeId = null;

        if (hash && hash.startsWith('episode-')) {
            episodeId = parseInt(hash.replace('episode-', ''));
        } else {
            // Последний загруженный выпуск
            const savedId = localStorage.getItem('lastEpisodeId');
            if (savedId) episodeId = parseInt(savedId);
        }

        if (episodeId) {
            const episode = episodes.find(ep => ep.id === episodeId);
            if (episode) {
                player.loadEpisode(episode);
                highlightActiveEpisode(episodeId);
            } else {
                // Если нет такого, загружаем первый
                loadFirstEpisode();
            }
        } else {
            loadFirstEpisode();
        }
    }

    // Загрузка первого (самого нового) выпуска
    function loadFirstEpisode() {
        if (episodes.length > 0) {
            player.loadEpisode(episodes[0]);
            highlightActiveEpisode(episodes[0].id);
        }
    }

    // Отслеживание изменения hash (например, при переходе по ссылке)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (hash && hash.startsWith('episode-')) {
            const episodeId = parseInt(hash.replace('episode-', ''));
            const episode = episodes.find(ep => ep.id === episodeId);
            if (episode) {
                player.loadEpisode(episode);
                highlightActiveEpisode(episodeId);
            }
        }
    });
});