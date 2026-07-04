## Login Flow

### Happy Path
- User can log in with valid credentials - `Done`
- User sees dashboard after login - `Done`
- Session persists on page refresh - `Pending`
- Logout clears session correctly - `Pending`

### Edge Cases
- Login with wrong password shows error - `Issue: error message not showing`
- Locked account shows correct message - `Pending`
- Password reset email is sent - `Done`

---

## Messaging

### Compose
- Send text message - `Done`
- Send image + text - `Done`
- Send with translation - `Pending`
- Schedule message - `Pending`

### Bulk
- Send to file (using their number) - `Done`
- Send to contact list - `Issue: phone number not ready`
- Scheduled bulk with segment - `Pending`

---

## Inbox

- Search sender - `Done`
- View conversation - `Done`
- Assign conversation - `Done`
- Archive conversation - `Done`
- Add note - `Done`
- Add follow-up - `Pending`
- Enable real-time translation - `Done`

---

## API

- POST /messages returns 200 - `Done`
- POST /messages returns 401 on bad auth - `Error: returning 500 instead`
- Rate limiting enforced - `Pending`
