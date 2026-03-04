class CinemaAPI {
    constructor(baseUrl = 'https://shfe-diplom.neto-server.ru') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('cinema_token');
    }
    
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}/${endpoint}`;
        const options = {
            method,
            headers: {}
        };

        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            const formData = new FormData();
            
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

    async getAllData() {
        return this.request('alldata');
    }

    async login(login, password) {
        const result = await this.request('login', 'POST', { login, password });
        this.token = result.token;
        localStorage.setItem('cinema_token', this.token);
        return result;
    }

    logout() {
        this.token = null;
        localStorage.removeItem('cinema_token');
    }

    isAuthenticated() {
        return !!this.token;
    }

    async getHalls() {
        const data = await this.getAllData();
        return data.halls || [];
    }

    async getHall(id) {
        const halls = await this.getHalls();
        return halls.find(hall => hall.id === id);
    }

    async createHall(name, rows, cols) {
        return this.request('hall', 'POST', {
            name,
            rows: parseInt(rows),
            cols: parseInt(cols)
        });
    }

    async deleteHall(id) {
        return this.request(`hall/${id}`, 'DELETE');
    }

    async updateHallConfig(id, config) {
        return this.request(`hall/${id}/configuration`, 'POST', config);
    }

    async updateHallPrices(id, prices) {
        return this.request(`hall/${id}/price`, 'POST', prices);
    }

    async toggleHallSales(id, open) {
        return this.request(`hall/${id}/open`, 'POST', { open: open ? 1 : 0 });
    }

    async getMovies() {
        const data = await this.getAllData();
        return data.films || [];
    }

    async getMovie(id) {
        const movies = await this.getMovies();
        return movies.find(movie => movie.id === id);
    }

    async createMovie(movieData) {
        return this.request('movie', 'POST', movieData);
    }

    async updateMovie(id, movieData) {
        return this.request(`movie/${id}`, 'POST', movieData);
    }

    async deleteMovie(id) {
        return this.request(`movie/${id}`, 'DELETE');
    }

    async getSessions() {
        const data = await this.getAllData();
        return data.seances || [];
    }

    async getSessionsByDate(date) {
        const allSessions = await this.getSessions();
        return allSessions.filter(session => session.date === date);
    }

    async getSessionsForMovie(movieId) {
        const allSessions = await this.getSessions();
        return allSessions.filter(session => session.film_id === movieId);
    }

    async getSessionsForHall(hallId) {
        const allSessions = await this.getSessions();
        return allSessions.filter(session => session.hall_id === hallId);
    }

    async createSession(sessionData) {
        return this.request('seance', 'POST', sessionData);
    }

    async deleteSession(id) {
        return this.request(`seance/${id}`, 'DELETE');
    }

    async getHallLayout(seanceId, date) {
        return this.request(`seance/${seanceId}/hall/${date}`);
    }

    async bookTickets(seanceId, seats) {
        return this.request(`seance/${seanceId}/ticket`, 'POST', { seats });
    }

    formatDate(date = new Date()) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getToday() {
        return this.formatDate();
    }

    getTomorrow() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.formatDate(tomorrow);
    }

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

    getDayName(date) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return days[date.getDay()];
    }

    isSessionPassed(sessionDate, sessionTime) {
        const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
        const now = new Date();
        return sessionDateTime < now;
    }

    getTimeFromTimestamp(timestamp) {
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
}

window.CinemaAPI = CinemaAPI;
window.api = new CinemaAPI();