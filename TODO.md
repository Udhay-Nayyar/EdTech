# TODO List for EdTech Project - Frontend Only

## 1. Update TODO.md
- [x] Remove backend-related tasks

## 2. Implement Notes Upload Feature
- [x] Add notes upload modal in TeacherDash.html
- [x] Add JavaScript logic for modal open/close and form submission
- [x] Add backend API endpoints for notes upload (/api/notes/upload and /api/notes)
- [x] Add cloud_notes folder and static serving for uploaded notes files

## 3. Display Notes on Student Dashboard
- [x] Add loadNotes function to fetch and display notes in dashboard.html
- [x] Call loadNotes on page load to populate the notes section

## 4. Implement Live Lecture Feature
- [x] Install socket.io and simple-peer dependencies in backend
- [x] Update server.js: Add Socket.io server, live session APIs, WebRTC signaling
- [ ] Update TeacherDash.html: Add "Start Live Lecture" button and modal with WebRTC broadcaster
- [ ] Update dashboard.html: Add live video player in Lectures section with WebRTC viewer
- [ ] Test live streaming functionality
