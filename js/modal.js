// modal.js
export function initModal() {
    const modal = document.getElementById('sessionModal');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const confirmAdd = document.getElementById('confirmAdd');
    const modalText = document.getElementById('modalText');

    let pendingSession = null;
    let draggedElement = null;
    let draggedType = null;

    function closeModal() {
        modal.classList.add('hidden');
        pendingSession = null;
    }

    modalCancelBtn.addEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });

    confirmAdd.addEventListener('click', () => {
        if (!pendingSession) return;

        const { timeline, title, duration, startMinutes } = pendingSession;

        const session = document.createElement('div');
        session.className = 'session';
        session.textContent = title;
        session.draggable = true;

        session.style.left = `${(startMinutes / 1440) * 100}%`;
        session.style.width = `${(duration / 1440) * 100}%`;

        session.addEventListener('dragstart', () => {
            draggedElement = session;
            draggedType = 'session';
        });

        timeline.appendChild(session);
        closeModal();
    });

    // Функция для открытия модалки с данными
    function openModal(sessionData) {
        pendingSession = sessionData;
        modalText.textContent = `Добавить «${pendingSession.title}» на ${formatTime(pendingSession.startMinutes)}?`;
        modal.classList.remove('hidden');
    }

    return { openModal };
}

// Хелпер
function formatTime(minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2,'0');
    const m = String(minutes % 60).padStart(2,'0');
    return `${h}:${m}`;
}
