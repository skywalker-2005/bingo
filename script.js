// Конфигурация
const GRID_SIZE = 40; // 8x5 сетка для бинго
const VIDEOS_FOLDER = 'videos'; // Папка с предзагруженными видео
const VIDEO_EXTENSIONS = ['mp4', 'MP4', 'webm', 'WebM', 'ogg', 'OGG', 'mov', 'MOV']; // Поддерживаемые расширения

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initializeBingoGrid();
    setupModal();
});

// Создание сетки бинго
function initializeBingoGrid() {
    const grid = document.getElementById('bingoGrid');
    
    for (let i = 1; i <= GRID_SIZE; i++) {
        const card = createBingoCard(i);
        grid.appendChild(card);
        
        // Загружаем видео из папки videos
        loadVideoFromFolder(i);
    }
}

// Создание карточки бинго
function createBingoCard(number) {
    const card = document.createElement('div');
    card.className = 'bingo-card';
    card.dataset.cardNumber = number;
    
    const cardNumber = document.createElement('div');
    cardNumber.className = 'card-number';
    cardNumber.textContent = number;
    card.appendChild(cardNumber);
    
    // Сохраняем обработчик для возможности его удаления
    const clickHandler = () => openCardModal(number);
    card.addEventListener('click', clickHandler);
    card.dataset.clickHandler = 'attached'; // Маркер для проверки
    
    return card;
}

// Настройка модального окна
function setupModal() {
    const modal = document.getElementById('cardModal');
    const closeBtn = document.getElementById('closeBtn');
    const modalContent = modal.querySelector('.modal-content');
    
    // Закрытие модального окна
    closeBtn.addEventListener('click', closeModal);
    
    // Закрытие при клике на фон модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Закрытие при клике в любом месте модального окна (кроме элементов управления видео)
    modalContent.addEventListener('click', (e) => {
        // Закрываем только если клик не на кнопку закрытия и не на элементы управления видео
        if (e.target !== closeBtn && 
            e.target.tagName !== 'VIDEO' && 
            !e.target.closest('video') && 
            e.target.tagName !== 'BUTTON' &&
            !e.target.closest('.video-info')) {
            closeModal();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Парсинг имени файла для извлечения названия и автора
// Формат: video1-Невозможное_возможно-Дима_Билан.mp4
// где - (дефис) - разделитель между номером, названием и исполнителем
// _ (подчеркивание) внутри названия и исполнителя означает пробел
function parseVideoFileName(fileName) {
    // Убираем расширение
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // Разделяем по дефису
    const parts = nameWithoutExt.split('-');
    
    if (parts.length >= 3) {
        // video1-Невозможное_возможно-Дима_Билан
        // parts[0] = "video1" (номер карточки)
        // parts[1] = "Невозможное_возможно" (название песни)
        // parts[2] = "Дима_Билан" (исполнитель)
        
        // Заменяем _ на пробелы в названии и исполнителе
        const songTitle = parts[1].replace(/_/g, ' ');
        const artist = parts[2].replace(/_/g, ' ');
        
        return {
            songTitle: songTitle,
            artist: artist
        };
    } else if (parts.length === 2) {
        // video1-Название (только название, без исполнителя)
        const songTitle = parts[1].replace(/_/g, ' ');
        return {
            songTitle: songTitle,
            artist: ''
        };
    }
    
    // Если формат не соответствует, возвращаем пустые значения
    return {
        songTitle: '',
        artist: ''
    };
}

// Поиск видео файла - пробуем стандартные имена и файлы с подчеркиваниями
async function findVideoFile(cardNumber) {
    // Сначала пробуем стандартные имена: video1.mp4, video1.MP4 и т.д.
    for (const ext of VIDEO_EXTENSIONS) {
        const testPath = `${VIDEOS_FOLDER}/video${cardNumber}.${ext}`;
        try {
            const response = await fetch(testPath, { method: 'HEAD' });
            if (response.ok) {
                return {
                    path: testPath,
                    fileName: `video${cardNumber}.${ext}`
                };
            }
        } catch (e) {
            // Файл не найден, пробуем следующий
        }
    }
    
    // Если стандартные имена не найдены, пробуем найти файлы с подчеркиваниями
    // Используем более практичный подход: пробуем загрузить через video элемент
    // Но без знания точного имени это сложно
    
    // Альтернативный подход: используем список известных файлов
    // или просим пользователя использовать стандартные имена
    
    return null;
}

// Открытие модального окна с карточкой
function openCardModal(cardNumber) {
    const modal = document.getElementById('cardModal');
    const video = document.getElementById('cardVideo');
    const uploadArea = document.getElementById('uploadArea');
    const videoInfo = document.getElementById('videoInfo');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    
    // Скрываем карточку сразу при открытии
    hideCard(cardNumber);
    
    modal.classList.add('active');
    // Плашка будет показана после загрузки видео, если есть информация
    videoInfo.style.display = 'none';
    
    // Создаем список паттернов для поиска файлов
    const patterns = [];
    
    // Проверяем, есть ли файл в VIDEO_LIST
    if (typeof VIDEO_LIST !== 'undefined' && VIDEO_LIST[cardNumber]) {
        patterns.push({
            path: `${VIDEOS_FOLDER}/${VIDEO_LIST[cardNumber]}`,
            fileName: VIDEO_LIST[cardNumber]
        });
    }
    
    // Стандартные имена: video1.mp4, video1.MP4 и т.д.
    for (const ext of VIDEO_EXTENSIONS) {
        patterns.push({
            path: `${VIDEOS_FOLDER}/video${cardNumber}.${ext}`,
            fileName: `video${cardNumber}.${ext}`
        });
    }
    
    // Файлы с форматом video{N}-*.ext загружаются через VIDEO_LIST
    // Добавьте имена файлов в videolist.js
    
    let currentPatternIndex = 0;
    let foundVideo = false;
    
    function tryLoadVideo() {
        if (foundVideo) return;
        
        if (currentPatternIndex >= patterns.length) {
            // Все паттерны перепробованы, видео не найдено
            uploadArea.innerHTML = `
                <div class="upload-text">
                    <p>⚠️ Видео не найдено</p>
                    <p class="upload-hint">Поместите файл video${cardNumber}-Название-Исполнитель.[mp4|webm|ogg|mov] в папку videos</p>
                    <p class="upload-hint" style="font-size: 0.9rem; margin-top: 10px;">Формат: video${cardNumber}-Название_песни-Исполнитель.mp4</p>
                    <p class="upload-hint" style="font-size: 0.9rem;">И добавьте его в файл videolist.js</p>
                </div>
            `;
            uploadArea.classList.remove('hidden');
            video.classList.remove('active');
            return;
        }
        
        const pattern = patterns[currentPatternIndex];
        const videoPath = pattern.path;
        const fileName = pattern.fileName;
        
        // Обработчики с once: true автоматически удаляются после первого вызова
        const onLoaded = () => {
            foundVideo = true;
            video.classList.add('active');
            uploadArea.classList.add('hidden');
            
            // Автоматическое воспроизведение
            video.play().catch(e => {
                // Если autoplay заблокирован, игнорируем ошибку
                console.log('Autoplay blocked:', e);
            });
            
            // Автоматическое закрытие при окончании видео
            video.addEventListener('ended', () => {
                closeModal();
            }, { once: true });
            
            // Парсим имя файла для извлечения информации
            const info = parseVideoFileName(fileName);
            
            // Всегда показываем плашку
            videoInfo.style.display = 'flex';
            
            if (info.songTitle || info.artist) {
                songTitle.textContent = info.songTitle || 'Неизвестная песня';
                songArtist.textContent = info.artist || 'Неизвестный исполнитель';
            } else {
                songTitle.textContent = 'Неизвестная песня';
                songArtist.textContent = 'Неизвестный исполнитель';
            }
        };
        
        const onError = () => {
            // Пробуем следующий паттерн
            currentPatternIndex++;
            tryLoadVideo();
        };
        
        video.addEventListener('loadeddata', onLoaded, { once: true });
        video.addEventListener('error', onError, { once: true });
        
        video.src = videoPath;
        video.load();
    }
    
    // Функция для поиска файлов с $ в имени через тестирование загрузки
    async function findFilesWithDollar(cardNumber) {
        // Пробуем загрузить файлы с разными расширениями
        for (const ext of VIDEO_EXTENSIONS) {
            // Пробуем загрузить файл через fetch для проверки существования
            // Но это требует CORS настроек, поэтому используем другой подход
            
            // Пробуем загрузить файл через создание тестового video элемента
            const testVideo = document.createElement('video');
            testVideo.preload = 'metadata';
            
            // Пробуем разные варианты имен с $ в формате video{N}$*.{ext}
            // Но без знания точного имени это невозможно
            
            // Поэтому используем более практичный подход:
            // Пробуем загрузить файл напрямую через video элемент
            // с паттерном video{N}$*.{ext}, но браузер не поддерживает wildcards
            
            // Временное решение: пробуем загрузить файл через создание video элемента
            // и проверку ошибок, но без знания точного имени это невозможно
        }
        
        return null;
    }
    
    tryLoadVideo();
}

// Загрузка видео из папки и создание превью
function loadVideoFromFolder(cardNumber) {
    let video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    
    // Проверяем VIDEO_LIST для файлов с дефисом
    const filePatterns = [];
    
    if (typeof VIDEO_LIST !== 'undefined' && VIDEO_LIST[cardNumber]) {
        filePatterns.push({
            path: `${VIDEOS_FOLDER}/${VIDEO_LIST[cardNumber]}`,
            fileName: VIDEO_LIST[cardNumber]
        });
    }
    
    // Добавляем стандартные расширения
    for (const ext of VIDEO_EXTENSIONS) {
        filePatterns.push({
            path: `${VIDEOS_FOLDER}/video${cardNumber}.${ext}`,
            fileName: `video${cardNumber}.${ext}`
        });
    }
    
    // Пробуем загрузить видео с разными паттернами
    let currentPatternIndex = 0;
    let foundVideo = false;
    let actualFileName = '';
    
    function tryLoadVideo() {
        if (foundVideo) return;
        
        if (currentPatternIndex >= filePatterns.length) {
            // Все паттерны перепробованы, видео не найдено
            return;
        }
        
        const pattern = filePatterns[currentPatternIndex];
        const videoPath = pattern.path;
        actualFileName = pattern.fileName;
        video.src = videoPath;
        
        video.addEventListener('loadedmetadata', () => {
            foundVideo = true;
            // Создаем превью из первого кадра
            video.currentTime = 0.1;
        }, { once: true });
        
        video.addEventListener('seeked', () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
                
                const videoData = {
                    url: videoPath,
                    thumbnail: thumbnail,
                    fileName: actualFileName
                };
                
                updateCard(cardNumber, videoData);
            } catch (e) {
                // Если не удалось создать превью, просто отмечаем карточку как имеющую видео
                const card = document.querySelector(`[data-card-number="${cardNumber}"]`);
                if (card) {
                    card.classList.add('has-video');
                }
            }
        }, { once: true });
        
        video.addEventListener('error', () => {
            // Пробуем следующий паттерн
            currentPatternIndex++;
            video = document.createElement('video');
            video.muted = true;
            video.preload = 'metadata';
            tryLoadVideo();
        }, { once: true });
        
        video.load();
    }
    
    tryLoadVideo();
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('cardModal');
    const video = document.getElementById('cardVideo');
    const uploadArea = document.getElementById('uploadArea');
    const videoInfo = document.getElementById('videoInfo');
    
    modal.classList.remove('active');
    if (video) {
        video.pause();
        video.currentTime = 0;
        video.src = '';
        video.classList.remove('active');
    }
    uploadArea.classList.add('hidden');
    videoInfo.style.display = 'none';
}

// Скрытие карточки после открытия
function hideCard(cardNumber) {
    const card = document.querySelector(`[data-card-number="${cardNumber}"]`);
    if (!card) return;
    
    // Делаем карточку неактивной и скрываем её содержимое
    card.classList.add('inactive');
    
    // Удаляем все обработчики событий, клонируя элемент
    const newCard = card.cloneNode(false);
    card.parentNode.replaceChild(newCard, card);
    
    // Удаляем все содержимое карточки, оставляя только пустое место
    newCard.innerHTML = '';
    newCard.style.visibility = 'hidden';
    newCard.style.pointerEvents = 'none';
    newCard.style.cursor = 'default';
}

// Обновление карточки после загрузки видео
function updateCard(cardNumber, videoData) {
    const card = document.querySelector(`[data-card-number="${cardNumber}"]`);
    if (!card) return;
    
    // Не добавляем класс has-video, так как не нужна иконка проигрыша
    // Карточка будет просто с номером
}
