class CinemaAPI {
    constructor(baseUrl = 'https://shfe-diplom.neto-server.ru') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('cinema_token');
    }

    // Общий метод для выполнения запросов
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}/${endpoint}`;
        const options = {
            method,
            headers: {}
        };

        // Добавляем токен авторизации, если есть
        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Добавляем данные для POST запросов
        if (data && (method === 'POST' || method === 'PUT')) {
            const formData = new FormData();
            
            // Рекурсивно добавляем данные в FormData
            const appendFormData = (formData, data, parentKey) => {
                if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
                    Object.keys(data).forEach(key => {
                        const value = data[key];
                        const formKey = parentKey ? `${parentKey}[${key}]` : key;
                        
                        if (value && typeof value === 'object' && !(value instanceof File)) {
                            appendFormData(formData, value, formKey);
                        } else {
                            formData.append(formKey, value === null ? '' : value);
                        }
                    });
                } else {
                    formData.append(parentKey, data === null ? '' : data);
                }
            };
            
            appendFormData(formData, data);
            options.body = formData;
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }
            
            return result.result;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // ========== ОБЩИЕ МЕТОДЫ ==========

    // Получить все данные (залы, фильмы, сеансы)
    async getAllData() {
        return this.request('alldata');
    }

    // Авторизация
    async login(login, password) {
        const result = await this.request('login', 'POST', { login, password });
        this.token = result.token;
        localStorage.setItem('cinema_token', this.token);
        return result;
    }

    // Выход
    logout() {
        this.token = null;
        localStorage.removeItem('cinema_token');
    }

    // Проверить авторизацию
    isAuthenticated() {
        return !!this.token;
    }

    // ========== РАБОТА С ЗАЛАМИ ==========

    // Получить все залы
    async getHalls() {
        const data = await this.getAllData();
        return data.halls || [];
    }

    // Получить зал по ID
    async getHall(id) {
        const halls = await this.getHalls();
        return halls.find(hall => hall.id === id);
    }

    // Создать новый зал
    async createHall(name, rows, cols) {
        return this.request('hall', 'POST', {
            name,
            rows: parseInt(rows),
            cols: parseInt(cols)
        });
    }

    // Удалить зал
    async deleteHall(id) {
        return this.request(`hall/${id}`, 'DELETE');
    }

    // Обновить конфигурацию зала
    async updateHallConfig(id, config) {
        return this.request(`hall/${id}/configuration`, 'POST', config);
    }

    // Обновить цены в зале
    async updateHallPrices(id, prices) {
        return this.request(`hall/${id}/price`, 'POST', prices);
    }

    // Старт/остановка продаж
    async toggleHallSales(id, open) {
        return this.request(`hall/${id}/open`, 'POST', { open: open ? 1 : 0 });
    }

    // ========== РАБОТА С ФИЛЬМАМИ ==========

    // Получить все фильмы
    async getMovies() {
        const data = await this.getAllData();
        return data.films || [];
    }

    // Получить фильм по ID
    async getMovie(id) {
        const movies = await this.getMovies();
        return movies.find(movie => movie.id === id);
    }

    // Создать новый фильм
    async createMovie(movieData) {
        return this.request('movie', 'POST', movieData);
    }

    // Обновить фильм
    async updateMovie(id, movieData) {
        return this.request(`movie/${id}`, 'POST', movieData);
    }

    // Удалить фильм
    async deleteMovie(id) {
        return this.request(`movie/${id}`, 'DELETE');
    }

    // ========== РАБОТА С СЕАНСАМИ ==========

    // Получить все сеансы
    async getSessions() {
        const data = await this.getAllData();
        return data.seances || [];
    }

    // Получить сеансы на конкретную дату
    async getSessionsByDate(date) {
        const allSessions = await this.getSessions();
        return allSessions.filter(session => session.date === date);
    }

    // Получить сеансы для фильма
    async getSessionsForMovie(movieId) {
        const allSessions = await this.getSessions();
        return allSessions.filter(session => session.film_id === movieId);
    }

    // Получить сеансы для зала
    async getSessionsForHall(hallId) {
        const allSessions = await this.getSessions();
        return allSessions.filter(session => session.hall_id === hallId);
    }

    // Создать сеанс
    async createSession(sessionData) {
        return this.request('seance', 'POST', sessionData);
    }

    // Удалить сеанс
    async deleteSession(id) {
        return this.request(`seance/${id}`, 'DELETE');
    }

    // ========== РАБОТА С БИЛЕТАМИ ==========

    // Получить схему зала для сеанса
    async getHallLayout(seanceId, date) {
        return this.request(`seance/${seanceId}/hall/${date}`);
    }

    // Купить билеты
    async bookTickets(seanceId, seats) {
        // seats должен быть массивом объектов {row, seat}
        return this.request(`seance/${seanceId}/ticket`, 'POST', { seats });
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    // Форматирование даты
    formatDate(date = new Date()) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Получить сегодняшнюю дату
    getToday() {
        return this.formatDate();
    }

    // Получить завтрашнюю дату
    getTomorrow() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.formatDate(tomorrow);
    }

    // Генерация дней недели
    getWeekDays(startDate = new Date()) {
        const days = [];
        const start = new Date(startDate);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            
            days.push({
                date: this.formatDate(date),
                dayName: this.getDayName(date),
                dayNumber: date.getDate(),
                isToday: i === 0
            });
        }
        
        return days;
    }

    // Получить название дня недели
    getDayName(date) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return days[date.getDay()];
    }

    // Проверить, прошел ли сеанс
    isSessionPassed(sessionDate, sessionTime) {
        const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
        const now = new Date();
        return sessionDateTime < now;
    }

    // Получить время из timestamp
    getTimeFromTimestamp(timestamp) {
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
}

window.CinemaAPI = CinemaAPI;