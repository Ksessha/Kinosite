// api-sync.js - Синхронизация между localStorage и API
class DataSync {
    constructor(api) {
        this.api = api;
        this.isAuthenticated = false;
        this.syncInterval = null;
    }

    // Инициализация - авторизация и первая синхронизация
    async init() {
        try {
            // Пытаемся авторизоваться
            await this.login();
            this.isAuthenticated = true;
            
            // Первоначальная синхронизация
            await this.fullSync();
            
            // Запускаем периодическую синхронизацию
            this.startAutoSync();
            
            console.log('DataSync initialized successfully');
        } catch (error) {
            console.error('DataSync init failed:', error);
            // Если не удалось подключиться к API, работаем только с localStorage
            this.isAuthenticated = false;
        }
    }

    // Авторизация в API
    async login() {
        try {
            // Используем стандартные учетные данные
            const result = await this.api.login('admin', 'admin');
            return result;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    // Полная синхронизация всех данных
    async fullSync() {
        if (!this.isAuthenticated) return;

        try {
            // 1. Синхронизируем залы
            await this.syncHalls();
            
            // 2. Синхронизируем фильмы
            await this.syncMovies();
            
            // 3. Синхронизируем сеансы
            await this.syncSessions();
            
            console.log('Full sync completed');
        } catch (error) {
            console.error('Full sync error:', error);
        }
    }

    // Синхронизация залов
    async syncHalls() {
        const localHalls = JSON.parse(localStorage.getItem('halls')) || [];
        const apiHalls = await this.api.getHalls();
        
        // Создаем карту API залов по имени для быстрого поиска
        const apiHallMap = new Map();
        apiHalls.forEach(hall => {
            apiHallMap.set(hall.name, hall);
        });

        // Для каждого локального зала
        for (const localHall of localHalls) {
            const apiHall = apiHallMap.get(localHall.name);
            
            if (!apiHall) {
                // Создаем новый зал в API
                try {
                    await this.api.createHall(
                        localHall.name,
                        localHall.rows || 5,
                        localHall.seats || 6
                    );
                    
                    // Обновляем цены
                    await this.updateHallPrices(localHall);
                    
                    // Обновляем статус продаж
                    if (localHall.salesOpen !== undefined) {
                        await this.api.toggleHallSales(
                            // Будем обновлять после получения ID
                            localHall.id,
                            localHall.salesOpen
                        );
                    }
                } catch (error) {
                    console.error(`Failed to create hall ${localHall.name}:`, error);
                }
            } else {
                // Обновляем существующий зал
                try {
                    // Обновляем конфигурацию
                    await this.api.updateHallConfig(apiHall.id, {
                        rows: localHall.rows || 5,
                        cols: localHall.seats || 6,
                        layout: localHall.layout || []
                    });
                    
                    // Обновляем цены
                    await this.updateHallPrices(localHall);
                    
                    // Обновляем статус продаж
                    if (localHall.salesOpen !== undefined) {
                        await this.api.toggleHallSales(
                            apiHall.id,
                            localHall.salesOpen
                        );
                    }
                } catch (error) {
                    console.error(`Failed to update hall ${localHall.name}:`, error);
                }
            }
        }
    }

    // В класс DataSync добавьте:
    async updateHallSales(localHall) {
        if (!this.isAuthenticated) return;
        
        const apiHalls = await this.api.getHalls();
        const apiHall = apiHalls.find(h => h.name === localHall.name);
        
        if (apiHall) {
            await this.api.toggleHallSales(apiHall.id, localHall.salesOpen);
        }
    }   

    // Обновление цен зала
    async updateHallPrices(localHall) {
        if (localHall.prices) {
            // Преобразуем формат цен из localStorage в формат API
            const prices = {
                normal: parseInt(localHall.prices.normal) || 300,
                vip: parseInt(localHall.prices.vip) || 500
            };
            
            // Получаем актуальный ID зала из API
            const apiHalls = await this.api.getHalls();
            const apiHall = apiHalls.find(h => h.name === localHall.name);
            
            if (apiHall) {
                await this.api.updateHallPrices(apiHall.id, prices);
            }
        }
    }

    // Синхронизация фильмов
    async syncMovies() {
        const localMovies = JSON.parse(localStorage.getItem('movies')) || [];
        const apiMovies = await this.api.getMovies();
        
        // Создаем карту API фильмов по названию
        const apiMovieMap = new Map();
        apiMovies.forEach(movie => {
            apiMovieMap.set(movie.name, movie);
        });

        for (const localMovie of localMovies) {
            const apiMovie = apiMovieMap.get(localMovie.title);
            
            const movieData = {
                name: localMovie.title,
                description: localMovie.description || '',
                duration: parseInt(localMovie.duration) || 90,
                country: localMovie.country || 'Россия',
                poster: localMovie.poster || ''
            };

            if (!apiMovie) {
                // Создаем новый фильм
                try {
                    await this.api.createMovie(movieData);
                } catch (error) {
                    console.error(`Failed to create movie ${localMovie.title}:`, error);
                }
            } else {
                // Обновляем существующий
                try {
                    await this.api.updateMovie(apiMovie.id, movieData);
                } catch (error) {
                    console.error(`Failed to update movie ${localMovie.title}:`, error);
                }
            }
        }
    }

    // Синхронизация сеансов
    async syncSessions() {
        const localHalls = JSON.parse(localStorage.getItem('halls')) || [];
        const apiHalls = await this.api.getHalls();
        const apiMovies = await this.api.getMovies();
        
        // Сначала удаляем все старые сеансы из API
        // (для простоты - в реальном приложении нужно аккуратно обновлять)
        
        // Для каждого локального зала
        for (const localHall of localHalls) {
            const apiHall = apiHalls.find(h => h.name === localHall.name);
            
            if (!apiHall || !localHall.sessions) continue;
            
            // Для каждого сеанса в зале
            for (const localSession of localSession.sessions) {
                const apiMovie = apiMovies.find(m => m.name === localSession.title);
                
                if (!apiMovie) continue;
                
                // Создаем сеанс в API
                try {
                    const sessionData = {
                        hall_id: apiHall.id,
                        film_id: apiMovie.id,
                        // Предполагаем, что сеанс на сегодня
                        date: this.getTodayDate(),
                        time: this.minutesToTime(localSession.startMinutes)
                    };
                    
                    await this.api.createSession(sessionData);
                } catch (error) {
                    console.error(`Failed to create session for ${localSession.title}:`, error);
                }
            }
        }
    }

    // Запуск автоматической синхронизации
    startAutoSync(intervalMinutes = 5) {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            this.fullSync();
        }, intervalMinutes * 60 * 1000);
    }

    // Остановка синхронизации
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Вспомогательные методы
    getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    minutesToTime(minutes) {
        if (!minutes) return '10:00';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    // Публичный метод для принудительной синхронизации
    async syncNow() {
        return await this.fullSync();
    }
}

// Глобальный экземпляр синхронизатора
let dataSync = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Инициализируем только на странице админки
    if (window.location.pathname.includes('admin')) {
        const api = new CinemaAPI();
        dataSync = new DataSync(api);
        
        try {
            await dataSync.init();
            console.log('Data synchronization ready');
            
            // Добавляем кнопку ручной синхронизации в админку
            addSyncButton();
        } catch (error) {
            console.warn('API synchronization unavailable, working in offline mode');
        }
    }
});

// Добавление кнопки синхронизации в админку
function addSyncButton() {
    const syncBtn = document.createElement('button');
    syncBtn.id = 'sync-btn';
    syncBtn.className = 'secondary-btn';
    syncBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.646 2.354a.5.5 0 0 0-.708 0L11.5 3.793V2.5a.5.5 0 0 0-1 0v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 0-1h-1.293l1.146-1.146a.5.5 0 0 0 0-.708zM2.5 11h1.293l-1.146 1.146a.5.5 0 0 0 .708.708L4.5 12.207V13.5a.5.5 0 0 0 1 0v-2a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0 0 1zm8.354-5.354a.5.5 0 0 0-.708 0L8.5 7.793V1.5a.5.5 0 0 0-1 0v6.293L5.854 5.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0 0-.708z" fill="currentColor"/>
        </svg>
        Синхронизировать с сервером
    `;
    
    syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = `
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
            Синхронизация...
        `;
        
        try {
            if (dataSync) {
                await dataSync.syncNow();
                alert('Данные успешно синхронизированы с сервером!');
            }
        } catch (error) {
            alert('Ошибка синхронизации: ' + error.message);
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.646 2.354a.5.5 0 0 0-.708 0L11.5 3.793V2.5a.5.5 0 0 0-1 0v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 0-1h-1.293l1.146-1.146a.5.5 0 0 0 0-.708zM2.5 11h1.293l-1.146 1.146a.5.5 0 0 0 .708.708L4.5 12.207V13.5a.5.5 0 0 0 1 0v-2a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0 0 1zm8.354-5.354a.5.5 0 0 0-.708 0L8.5 7.793V1.5a.5.5 0 0 0-1 0v6.293L5.854 5.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0 0-.708z" fill="currentColor"/>
                </svg>
                Синхронизировать с сервером
            `;
        }
    });
    
    // Вставляем кнопку в админку (например, в первый section)
    const firstSection = document.querySelector('.admin-section');
    if (firstSection) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'sync-container';
        actionsDiv.style.marginTop = '20px';
        actionsDiv.style.textAlign = 'center';
        actionsDiv.appendChild(syncBtn);
        
        firstSection.appendChild(actionsDiv);
    }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataSync };
}