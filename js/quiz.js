// Quiz attempt functionality
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let quizTimer = null;
let timeRemaining = 0;

function startQuiz(quizId) {
    // Fetch quiz details
    fetchQuizDetails(quizId);
}

async function fetchQuizDetails(quizId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/quizzes/${quizId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const quiz = await response.json();
            showQuizInterface(quiz);
        } else {
            alert('Failed to load quiz');
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert('Error loading quiz');
    }
}

function showQuizInterface(quiz) {
    currentQuiz = quiz;
    currentQuestionIndex = 0;
    userAnswers = new Array(quiz.questions.length).fill(null);
    timeRemaining = quiz.duration * 60; // Convert to seconds

    // Create quiz modal
    const modal = document.createElement('div');
    modal.classList.add('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
    modal.id = 'quiz-modal';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">${quiz.title}</h2>
                <div id="timer" class="text-lg font-semibold text-red-600"></div>
            </div>
            <div id="question-container" class="mb-6">
                <!-- Questions will be displayed here -->
            </div>
            <div class="flex justify-between">
                <button id="prev-btn" class="btn btn-secondary" disabled>Previous</button>
                <div id="question-nav" class="flex space-x-2">
                    <!-- Question navigation buttons -->
                </div>
                <button id="next-btn" class="btn btn-primary">Next</button>
            </div>
            <div class="mt-6 text-center">
                <button id="submit-quiz-btn" class="btn btn-success hidden">Submit Quiz</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Start timer
    startTimer();

    // Show first question
    showQuestion(0);
    updateNavigation();

    // Event listeners
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion(currentQuestionIndex);
            updateNavigation();
        }
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
            updateNavigation();
        }
    });

    document.getElementById('submit-quiz-btn').addEventListener('click', submitQuiz);
}

function startTimer() {
    const timerElement = document.getElementById('timer');

    quizTimer = setInterval(() => {
        timeRemaining--;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeRemaining <= 0) {
            clearInterval(quizTimer);
            submitQuiz();
        }
    }, 1000);
}

function showQuestion(index) {
    const question = currentQuiz.questions[index];
    const container = document.getElementById('question-container');

    container.innerHTML = `
        <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Question ${index + 1} of ${currentQuiz.questions.length}</h3>
            <p class="text-gray-700 mb-4">${question.question}</p>
            <div class="space-y-2">
                ${question.options.map((option, optionIndex) => `
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="answer" value="${optionIndex}" ${userAnswers[index] === optionIndex ? 'checked' : ''} class="form-radio">
                        <span>${String.fromCharCode(65 + optionIndex)}. ${option}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;

    // Add event listeners to radio buttons
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            userAnswers[index] = parseInt(e.target.value);
        });
    });
}

function updateNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-quiz-btn');
    const navContainer = document.getElementById('question-nav');

    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.textContent = currentQuestionIndex === currentQuiz.questions.length - 1 ? 'Finish' : 'Next';
    submitBtn.classList.toggle('hidden', currentQuestionIndex !== currentQuiz.questions.length - 1);

    // Update question navigation
    navContainer.innerHTML = '';
    for (let i = 0; i < currentQuiz.questions.length; i++) {
        const navBtn = document.createElement('button');
        navBtn.textContent = i + 1;
        navBtn.classList.add('w-8', 'h-8', 'rounded-full', 'text-sm', 'font-semibold');
        navBtn.classList.add(userAnswers[i] !== null ? 'bg-green-500' : 'bg-gray-300');
        navBtn.classList.add(i === currentQuestionIndex ? 'ring-2' : '');
        navBtn.addEventListener('click', () => {
            currentQuestionIndex = i;
            showQuestion(i);
            updateNavigation();
        });
        navContainer.appendChild(navBtn);
    }
}

function submitQuiz() {
    clearInterval(quizTimer);

    // Calculate score
    let correctAnswers = 0;
    currentQuiz.questions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
            correctAnswers++;
        }
    });

    const score = Math.round((correctAnswers / currentQuiz.questions.length) * 100);

    // Show results
    const modal = document.getElementById('quiz-modal');
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
            <h2 class="text-2xl font-bold mb-4">Quiz Completed!</h2>
            <div class="text-6xl mb-4">${score}%</div>
            <p class="text-gray-600 mb-4">You got ${correctAnswers} out of ${currentQuiz.questions.length} questions correct.</p>
            <button id="close-quiz-btn" class="btn btn-primary">Close</button>
        </div>
    `;

    document.getElementById('close-quiz-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // TODO: Send results to backend for storage
}
