document.addEventListener('DOMContentLoaded', () => {
    // Load quizzes on page load
    loadQuizzes();

    // Handle mentorship booking
    setupMentorshipBooking();

    async function loadQuizzes() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/quizzes/student', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const quizzes = await response.json();
                displayQuizzes(quizzes);
            } else {
                console.error('Failed to load quizzes');
            }
        } catch (error) {
            console.error('Error loading quizzes:', error);
        }
    }

    function displayQuizzes(quizzes) {
        const quizzesSection = document.getElementById('quizzes');
        const quizContent = quizzesSection.querySelector('.bg-white.p-6.rounded-lg.shadow');

        if (quizzes.length === 0) {
            quizContent.innerHTML = `
                <h3 class="font-bold text-xl mb-4">Quizzes & Assignments</h3>
                <p>No quizzes available for your grade yet.</p>
            `;
            return;
        }

        // Keep the first quiz as is (static) and add dynamic ones
        const existingQuiz = quizContent.innerHTML;
        const dynamicQuizzes = quizzes.map(quiz => `
            <div class="bg-white p-6 rounded-lg shadow mt-6">
                <h3 class="font-bold text-xl mb-4">${quiz.title}</h3>
                <p class="text-gray-600 mb-4">${quiz.subject} - Grade ${quiz.grade}</p>
                <p class="text-gray-600 mb-4">Duration: ${quiz.duration} minutes | Questions: ${quiz.questions.length}</p>
                <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold text-gray-600">Created: ${new Date(quiz.createdAt).toLocaleDateString()}</span>
                    <button class="start-quiz-btn bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700" data-quiz-id="${quiz._id}">Start Quiz</button>
                </div>
            </div>
        `).join('');

        quizContent.innerHTML = existingQuiz + dynamicQuizzes;

        // Add event listeners to start quiz buttons
        document.querySelectorAll('.start-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quizId = e.target.getAttribute('data-quiz-id');
                startQuiz(quizId);
            });
        });
    }

    function startQuiz(quizId) {
        // For now, just alert. In full implementation, navigate to quiz page
        alert(`Starting quiz ${quizId}`);
        // TODO: Implement quiz attempt functionality
    }

    function setupMentorshipBooking() {
        const bookButtons = document.querySelectorAll('#mentorship .bg-green-600');

        bookButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const teacherCard = e.target.closest('.bg-white');
                const teacherName = teacherCard.querySelector('h3').textContent;
                const teacherSubject = teacherCard.querySelector('p').textContent;

                showBookingModal(teacherName, teacherSubject);
            });
        });
    }

    function showBookingModal(teacherName, teacherSubject) {
        // Create modal for booking
        const modal = document.createElement('div');
        modal.classList.add('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 class="text-2xl font-bold mb-4">Book Session with ${teacherName}</h2>
                <p class="text-gray-600 mb-4">${teacherSubject}</p>
                <form id="booking-form">
                    <div class="mb-4">
                        <label for="session-date" class="block font-semibold mb-1">Date & Time</label>
                        <input type="datetime-local" id="session-date" name="requestedDateTime" required class="w-full border border-gray-300 rounded px-3 py-2">
                    </div>
                    <div class="mb-4">
                        <label for="session-reason" class="block font-semibold mb-1">Reason for Session</label>
                        <textarea id="session-reason" name="reason" required class="w-full border border-gray-300 rounded px-3 py-2" rows="3" placeholder="Describe what you need help with..."></textarea>
                    </div>
                    <div class="flex justify-end space-x-4">
                        <button type="button" id="cancel-booking" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Book Session</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const bookingForm = modal.querySelector('#booking-form');
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(bookingForm);
            const bookingData = {
                teacher: teacherName, // This should be teacher ID, but for now using name
                subject: teacherSubject,
                reason: formData.get('reason'),
                requestedDateTime: formData.get('requestedDateTime')
            };

            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/api/sessions/book', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(bookingData)
                });

                if (response.ok) {
                    alert('Session booked successfully! The teacher will be notified.');
                    document.body.removeChild(modal);
                } else {
                    const error = await response.json();
                    alert('Error booking session: ' + error.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error booking session. Please try again.');
            }
        });

        // Handle cancel
        modal.querySelector('#cancel-booking').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
});
