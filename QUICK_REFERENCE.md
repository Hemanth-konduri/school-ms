# Quick Reference: Student Management Actions

## 🎯 Action Buttons (in each student row)

| Button | Icon | Color | Action | Reversible? |
|--------|------|-------|--------|-------------|
| **Edit** | ✏️ Pencil | Blue | Change batch, roll number, semester | Yes |
| **Disable** | 🚫 Ban | Orange | Block student login | Yes (Enable) |
| **Enable** | ✅ Ban | Green | Restore student login | Yes (Disable) |
| **Delete** | 🗑️ Trash | Red | Remove student permanently | **NO** |

## 📝 Edit Student
**What you can edit:**
- Batch assignment (dropdown of available batches)
- Roll number (text field)
- Semester (number field)

**Steps:**
1. Click blue Edit button
2. Modify fields in dialog
3. Click "Save Changes"
4. Student data updated

## 🚫 Disable Account
**What it does:**
- Student cannot login
- Shows error: "Your account has been disabled on [date]"
- Stores disabled date in database

**Steps:**
1. Click orange Ban button
2. Confirm: "Yes, Disable"
3. Account immediately disabled

**To re-enable:**
1. Click green Ban button (same button, different color)
2. Confirm: "Yes, Enable"
3. Student can login again

## 🗑️ Delete Student
**⚠️ WARNING: PERMANENT ACTION**
- Removes student from database completely
- Cannot be undone
- Use only when absolutely necessary

**Steps:**
1. Click red Trash button
2. Read warning carefully
3. Confirm: "Yes, Delete"
4. Student permanently removed

## 🔍 Finding Students

### Filters
- **School** → **Program** → **Group** → **Academic Year**
- Click "Apply" to load filtered students
- Click "Clear All" to reset filters

### Search
- Search by: Name, Admission Number, Email, Batch
- Real-time filtering (no need to click Apply)

### Batch Groups
- Students grouped by batch
- "Unassigned Students" group for students without batch
- Click batch header to expand/collapse

## 📊 Stats Dashboard
- **Total Students**: All students in system
- **Batch Assigned**: Students with a batch
- **Unassigned**: Students without batch

## 🔐 Security Notes
- All actions require admin login
- Confirmations prevent accidents
- Disabled accounts checked at login
- Audit trail via timestamps

## 💡 Tips
1. **Test first**: Use test accounts before real students
2. **Disable vs Delete**: Prefer disable (reversible) over delete
3. **Batch assignment**: Use Edit button or Batches page
4. **Bulk operations**: Assign multiple students via Batches page
5. **Check console**: F12 for error messages if issues occur

## 🆘 Common Issues

**Students not showing?**
- Click "Apply" button
- Clear filters
- Check browser console (F12)
- Run SQL migration (see TROUBLESHOOTING_STUDENTS.md)

**Can't edit batch?**
- Student must have school/program/group assigned
- Batch must exist for that combination
- Check available batches in dropdown

**Disable not working?**
- Run SQL migration first (add_student_disable_columns.sql)
- Check browser console for errors
- Verify Supabase connection

## 📞 Need Help?
See detailed documentation:
- `STUDENT_MANAGEMENT_FEATURES.md` - Full feature guide
- `TROUBLESHOOTING_STUDENTS.md` - Problem solving
- `CHANGES_SUMMARY.md` - Technical details
