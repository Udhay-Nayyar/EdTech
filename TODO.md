# TODO List for EdTech Project Features

## 1. Quiz Creation for Teachers
- [ ] Implement quiz creation modal/form logic in js/teacherDash.js
- [ ] Handle "New Quiz" button click to show quiz creation form
- [ ] Send POST request to /quizzes with quiz data
- [ ] Handle form submission and success/error responses

## 2. Quiz Display on Student Dashboard
- [ ] Implement quiz fetching in js/dashboard.js
- [ ] Fetch quizzes from GET /quizzes/student on page load
- [ ] Dynamically display quizzes in the Quizzes section
- [ ] Add "Start Quiz" button functionality

## 3. Quiz Attempt Functionality
- [ ] Implement quiz attempt logic in js/quiz.js
- [ ] Create quiz interface for attempting quizzes
- [ ] Handle quiz submission and scoring

## 4. Mentorship Session Booking
- [ ] Implement booking logic in js/dashboard.js
- [ ] Handle "Book a Session" button clicks
- [ ] Show booking form (date/time, reason)
- [ ] Send POST request to /sessions/book

## 5. Teacher Notifications for Session Requests
- [ ] Implement session request fetching in js/teacherDash.js
- [ ] Display session requests in teacher dashboard
- [ ] Add accept/reject functionality for sessions
- [ ] Send PATCH requests to update session status

## 6. Testing and Integration
- [ ] Test all frontend-backend integrations
- [ ] Ensure proper authentication handling
- [ ] Add error handling and user feedback
