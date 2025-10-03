document.addEventListener('DOMContentLoaded', () => {
    const newQuizBtn = document.getElementById('new-quiz-btn');
    const quizModal = document.getElementById('quiz-modal');
    const cancelQuizBtn = document.getElementById('cancel-quiz-btn');
    const quizForm = document.getElementById('quiz-form');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');

    // Show quiz modal
    newQuizBtn.addEventListener('click', () => {
        quizModal.style.display = 'flex';
        if (questionsContainer.children.length <= 1) {
            addQuestion(); // Add first question if none present
        }
    });

    // Hide quiz modal
    cancelQuizBtn.addEventListener('click', () => {
        quizModal.style.display = 'none';
        quizForm.reset();
        clearQuestions();
    });

    // Add question UI
    addQuestionBtn.addEventListener('click', () => {
        addQuestion();
    });

    // Clear questions container
    function clearQuestions() {
        while (questionsContainer.children.length > 1) {
            questionsContainer.removeChild(questionsContainer.lastChild);
        }
    }

    // Add a question form group
    function addQuestion() {
        const questionIndex = questionsContainer.children.length - 1;

        const questionDiv = document.createElement('div');
        questionDiv.classList.add('mb-4', 'border', 'border-gray-300', 'rounded', 'p-3');

        questionDiv.innerHTML = `
            <label class="block font-semibold mb-1">Question ${questionIndex + 1}</label>
            <input type="text" name="question-${questionIndex}" placeholder="Enter question" required class="w-full border border-gray-300 rounded px-3 py-2 mb-2">
            <div class="grid grid-cols-2 gap-2">
                <input type="text" name="option-${questionIndex}-0" placeholder="Option A" required class="border border-gray-300 rounded px-3 py-2">
                <input type="text" name="option-${questionIndex}-1" placeholder="Option B" required class="border border-gray-300 rounded px-3 py-2">
                <input type="text" name="option-${questionIndex}-2" placeholder="Option C" required class="border border-gray-300 rounded px-3 py-2">
                <input type="text" name="option-${questionIndex}-3" placeholder="Option D" required class="border border-gray-300 rounded px-3 py-2">
            </div>
            <label class="block font-semibold mt-2 mb-1">Correct Answer</label>
            <select name="correct-${questionIndex}" required class="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">Select correct answer</option>
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
                <option value="3">D</option>
            </select>
            <button type="button" class="remove-question-btn mt-2 text-red-600 hover:text-red-800">Remove Question</button>
        `;

        questionsContainer.appendChild(questionDiv);

        // Add event listener to remove button
        questionDiv.querySelector('.remove-question-btn').addEventListener('click', () => {
            questionsContainer.removeChild(questionDiv);
            updateQuestionLabels();
        });
    }

    // Update question labels after removal
    function updateQuestionLabels() {
        const questionDivs = questionsContainer.querySelectorAll('div.mb-4');
        questionDivs.forEach((div, index) => {
            const label = div.querySelector('label');
            label.textContent = `Question ${index + 1}`;
            // Update input/select names
            div.querySelector(`input[name^="question-"]`).name = `question-${index}`;
            for (let i = 0; i < 4; i++) {
                div.querySelector(`input[name^="option-"][name$="-${i}"]`).name = `option-${index}-${i}`;
            }
            div.querySelector(`select[name^="correct-"]`).name = `correct-${index}`;
        });
    }

    // Handle quiz form submission
    quizForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(quizForm);
        const quizData = {
            title: formData.get('title'),
            subject: formData.get('subject'),
            grade: parseInt(formData.get('grade')),
            duration: parseInt(formData.get('duration')),
            questions: []
        };

        // Collect questions
        const questionElements = questionsContainer.querySelectorAll('div.mb-4');
        questionElements.forEach((questionDiv, index) => {
            const question = formData.get(`question-${index}`);
            const options = [
                formData.get(`option-${index}-0`),
                formData.get(`option-${index}-1`),
                formData.get(`option-${index}-2`),
                formData.get(`option-${index}-3`)
            ];
            const correctAnswer = parseInt(formData.get(`correct-${index}`));

            quizData.questions.push({
                question,
                options,
                correctAnswer
            });
        });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/quizzes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(quizData)
            });

            if (response.ok) {
                alert('Quiz created successfully!');
                quizModal.style.display = 'none';
                quizForm.reset();
                clearQuestions();
            } else {
                const error = await response.json();
                alert('Error creating quiz: ' + error.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error creating quiz. Please try again.');
        }
    });

    // Load session requests for notifications
    loadSessionRequests();

    async function loadSessionRequests() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/sessions/requests', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const requests = await response.json();
                updateNotificationBadge(requests.length);
                displaySessionRequests(requests);
            }
        } catch (error) {
            console.error('Error loading session requests:', error);
        }
    }

    function updateNotificationBadge(count) {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    function displaySessionRequests(requests) {
        // For now, just log them. In a full implementation, you'd add a notifications panel
        console.log('Session requests:', requests);
        // TODO: Add UI to display and manage session requests
    }
});
