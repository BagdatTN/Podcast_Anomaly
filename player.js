/**
 * Класс управления аудиоплеером
 * - воспроизведение/пауза
 * - перемотка +/-10 сек
 * - изменение скорости
 * - прогресс-бар и таймер
 * - сохранение позиции в localStorage каждые 5 сек
 */

class Player {
    constructor() {
        this.audio = new Audio();
        this.episodeId = null;
        this.saveInterval = null;

        // Элементы UI
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.playPauseIcon = document.getElementById('playPauseIcon');
        this.seekSlider = document.getElementById('seek');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.totalTimeSpan = document.getElementById('totalTime');
        this.nowPlayingTitle = document.getElementById('nowPlayingTitle');
        this.nowPlayingMeta = document.getElementById('nowPlayingMeta');
        this.rewindBtn = document.getElementById('rewindBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        this.speedBtn = document.getElementById('speedBtn');
        this.playbackSpeeds = [1, 1.5, 2];
        this.currentSpeedIndex = 0;

        this.initEvents();
        this.initSpeedButtons();
        this.startSaveInterval();
    }

    // Привязка событий аудио
    initEvents() {
        this.audio.addEventListener('loadedmetadata', () => {
            this.totalTimeSpan.textContent = this.formatTime(this.audio.duration);
            this.seekSlider.max = this.audio.duration;
            // Восстанавливаем позицию, если есть сохранённая
            const savedTime = this.getSavedProgress(this.episodeId);
            if (savedTime && savedTime < this.audio.duration) {
                this.audio.currentTime = savedTime;
            }
        });

        this.audio.addEventListener('timeupdate', () => {
            this.currentTimeSpan.textContent = this.formatTime(this.audio.currentTime);
            this.seekSlider.value = this.audio.currentTime;
        });

        this.audio.addEventListener('ended', () => {
            this.pause();
            // Не переключаем на следующий выпуск
        });

        // Обработка ошибок загрузки
        this.audio.addEventListener('error', (e) => {
            console.error('Ошибка загрузки аудио:', e);
            this.nowPlayingTitle.textContent = 'Ошибка загрузки';
        });

        // Кнопки плеера
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.rewindBtn.addEventListener('click', () => this.seek(-10));
        this.forwardBtn.addEventListener('click', () => this.seek(10));
        this.seekSlider.addEventListener('input', (e) => {
            const newTime = parseFloat(e.target.value);
            this.audio.currentTime = newTime;
            this.currentTimeSpan.textContent = this.formatTime(newTime);
        });
    }

    // Инициализация кнопок скорости
    initSpeedButtons() {
        if (!this.speedBtn) return;

        // начальная скорость 1x
        this.audio.playbackRate = this.playbackSpeeds[this.currentSpeedIndex];
        this.speedBtn.textContent = `${this.playbackSpeeds[this.currentSpeedIndex]}x`;
        this.speedBtn.classList.add('active');

        this.speedBtn.addEventListener('click', () => {
            this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.playbackSpeeds.length;
            const speed = this.playbackSpeeds[this.currentSpeedIndex];
            this.audio.playbackRate = speed;
            this.speedBtn.textContent = `${speed}x`;
        });
    }

    // Переключение воспроизведения
    togglePlay() {
        if (this.audio.paused) {
            this.audio.play().catch(e => console.log('Автоплей заблокирован:', e));
            this.playPauseIcon.className = 'fas fa-pause';
        } else {
            this.audio.pause();
            this.playPauseIcon.className = 'fas fa-play';
        }
    }

    play() {
        this.audio.play().catch(e => console.log('Ошибка воспроизведения:', e));
        this.playPauseIcon.className = 'fas fa-pause';
    }

    pause() {
        this.audio.pause();
        this.playPauseIcon.className = 'fas fa-play';
    }

    // Перемотка на delta секунд (относительно текущей)
    seek(delta) {
        if (this.audio.src) {
            this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + delta));
        }
    }

    // Загрузка нового выпуска
    loadEpisode(episode) {
        // Сохраняем прогресс предыдущего выпуска
        if (this.episodeId) {
            this.saveProgress();
        }

        this.episodeId = episode.id;
        this.nowPlayingTitle.textContent = episode.title;

        // Если тот же файл - не перезагружаем
        if (this.audio.src && this.audio.src.includes(episode.audio)) {
            // Восстанавливаем позицию (уже сделано в loadedmetadata)
            if (this.audio.paused) {
                // ничего
            }
        } else {
            this.audio.src = episode.audio;
            this.audio.load();
        }

        // Восстанавливаем позицию (обработчик loadedmetadata сделает)
        // Сбрасываем play/pause иконку
        this.pause();

        // Сохраняем последний загруженный выпуск
        localStorage.setItem('lastEpisodeId', episode.id);
    }

    // Форматирование времени:
    // - до 1 часа: мм:сс
    // - 1 час и больше: ч:мм:сс
    formatTime(seconds) {
        if (isNaN(seconds) || seconds <= 0) return '00:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Сохранение текущей позиции в localStorage
    saveProgress() {
        if (this.episodeId && this.audio.currentTime > 0) {
            localStorage.setItem(`episode_${this.episodeId}_progress`, this.audio.currentTime);
        }
    }

    // Получение сохранённой позиции для эпизода
    getSavedProgress(episodeId) {
        return parseFloat(localStorage.getItem(`episode_${episodeId}_progress`)) || 0;
    }

    // Запуск интервала сохранения (каждые 5 сек)
    startSaveInterval() {
        this.saveInterval = setInterval(() => this.saveProgress(), 5000);
    }

    // Остановка интервала (если нужно)
    stopSaveInterval() {
        clearInterval(this.saveInterval);
    }
}