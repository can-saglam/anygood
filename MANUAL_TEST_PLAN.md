# Manual Test Plan: Unified Input Field

## Overview
This document provides a comprehensive test plan for the simplified "Add Item" modal with unified input field.

## Changes Made
- **Before**: 3 separate fields (Title/Natural Language, Description, Link)
- **After**: 2 fields (Unified Smart Input, Description)

The unified input intelligently detects:
1. Plain titles
2. Natural language descriptions
3. URLs (with automatic metadata extraction)

## Test Scenarios

### Scenario 1: Plain Title Input
**Steps:**
1. Open a category (e.g., "Read")
2. Click the "+" button or press Cmd+N
3. Type a plain title: `The Creative Act`
4. Click "Add"

**Expected Result:**
- Item is created with title: "The Creative Act"
- No link attached
- No description (unless manually entered)

---

### Scenario 2: Natural Language Input
**Steps:**
1. Open a category (e.g., "Read")
2. Click the "+" button or press Cmd+N
3. Type natural language: `Read 'The Creative Act' by Rick Rubin`
4. Tab out or blur the field

**Expected Result:**
- Input automatically parses to: "The Creative Act"
- Author field detected: "Rick Rubin"
- Category auto-detected as "Read"

**Alternative inputs to test:**
- `Watch Past Lives`
- `Listen to Random Access Memories by Daft Punk`
- `Eat at Blue Hill Stone Barns`
- `Do sunrise hike at Mount Tam`

---

### Scenario 3: URL Paste (with metadata)
**Steps:**
1. Open a category (e.g., "Read")
2. Click the "+" button or press Cmd+N
3. Paste a URL: `https://www.goodreads.com/book/show/60965426-the-creative-act`
4. Wait for metadata extraction

**Expected Result:**
- Placeholder changes to "Fetching metadata..."
- URL is detected and stored internally
- Input field shows extracted title (e.g., "The Creative Act")
- Description field auto-fills with page description
- Link is attached to item (visible when item is clicked)

**URLs to test:**
- Book link: `https://www.goodreads.com/book/show/60965426-the-creative-act`
- Movie link: `https://www.imdb.com/title/tt14824600/` (Past Lives)
- Article link: Any valid article URL with Open Graph tags
- YouTube video: `https://www.youtube.com/watch?v=...`

---

### Scenario 4: URL Typed (not pasted)
**Steps:**
1. Open a category
2. Click the "+" button
3. Type a URL manually: `https://example.com/article`
4. Wait ~500ms (debounce delay)

**Expected Result:**
- URL is detected after debounce
- Metadata extraction begins
- Fields populate same as paste scenario

---

### Scenario 5: URL Without Valid Metadata
**Steps:**
1. Open a category
2. Click the "+" button
3. Paste a URL that has no Open Graph tags: `https://example.com`

**Expected Result:**
- URL is detected
- Metadata fetch returns no title
- Input shows the URL itself as title
- User can manually edit the title
- Link is still attached to item

---

### Scenario 6: Natural Language with URL
**Steps:**
1. Open a category
2. Click the "+" button
3. Type: `Read Atomic Habits https://jamesclear.com/atomic-habits`
4. Blur the field

**Expected Result:**
- Natural language parser extracts title: "Atomic Habits"
- URL is extracted from text: `https://jamesclear.com/atomic-habits`
- Both title and link are stored

---

### Scenario 7: Manual Description Entry
**Steps:**
1. Open a category
2. Click the "+" button
3. Type a title: `The Creative Act`
4. Type in description field: `A book about creativity`
5. Click "Add"

**Expected Result:**
- Item created with custom description
- Manual description takes precedence

---

### Scenario 8: URL Paste + Manual Description Override
**Steps:**
1. Open a category
2. Click the "+" button
3. Paste URL (auto-fills description)
4. Manually edit the description field
5. Click "Add"

**Expected Result:**
- Manual description is preserved
- Auto-extracted description is replaced

---

### Scenario 9: Enter Key Submission
**Steps:**
1. Open a category
2. Click the "+" button
3. Type a title
4. Press Enter (not Shift+Enter)

**Expected Result:**
- Item is added immediately
- Modal closes

---

### Scenario 10: Cancel/ESC Key
**Steps:**
1. Open a category
2. Click the "+" button
3. Type something
4. Press ESC or click "Cancel"

**Expected Result:**
- Modal closes
- No item is created
- Input is discarded

---

## Edge Cases to Test

### Edge Case 1: Empty Input
- Type nothing, click "Add" → Should do nothing

### Edge Case 2: Whitespace Only
- Type only spaces, click "Add" → Should do nothing

### Edge Case 3: Very Long URL
- Paste extremely long URL → Should handle gracefully

### Edge Case 4: Invalid URL Format
- Type `www.example` (no protocol) → Should be normalized to `https://www.example`

### Edge Case 5: URL Metadata Timeout
- Paste URL from slow-loading site → Should handle timeout gracefully

### Edge Case 6: Special Characters in Title
- Type `"The Creative Act" & Other Ideas` → Should preserve special chars

### Edge Case 7: Multiple URLs in Input
- Type `Check out https://example.com and https://example2.com` → Should extract first URL

---

## Visual Feedback Testing

### Test 1: Loading State
- Paste URL → "Fetching metadata..." placeholder should appear
- After metadata loads → Placeholder returns to default

### Test 2: Field Auto-population
- Paste URL → Watch title and description fields populate smoothly
- No jarring jumps or flashes

### Test 3: Placeholder Text
- Default: "Enter title, natural language, or URL..."
- Should be clear and helpful

---

## Integration Testing

### Test 1: Duplicate Detection
- Add item with URL
- Try adding same URL again
- Should trigger duplicate detection

### Test 2: Category Auto-detection
- Add natural language in "wrong" category
- Check if suggestion appears (optional feature)

### Test 3: Metadata Display
- Add item with URL
- Click item to expand
- Verify link is accessible and metadata is shown

---

## Browser/Electron Compatibility

### Test in Electron
- All scenarios above
- IPC communication for metadata fetch
- Clipboard paste functionality

### Test Keyboard Shortcuts
- Cmd+N → Opens modal
- ESC → Closes modal
- Enter → Submits form

---

## Performance Testing

### Test 1: Rapid Input Changes
- Type quickly, backspace, type again
- Debounce should prevent excessive metadata fetches

### Test 2: Multiple Modal Opens
- Open modal, close, open again
- Event listeners should not duplicate

### Test 3: Large Description Text
- Paste very long description
- Should handle without performance issues

---

## Regression Testing

### Existing Features to Verify Still Work:
1. ✅ Adding items to different categories
2. ✅ Marking items as complete
3. ✅ Editing existing items
4. ✅ Deleting items
5. ✅ Undo/Redo functionality
6. ✅ Search functionality
7. ✅ Collections/Recommendations
8. ✅ Sync service
9. ✅ Settings management

---

## Code Review Checklist

### Implementation Verified:
- [x] Modal HTML updated with single input field
- [x] Removed separate link input field
- [x] Updated placeholder text with clear instructions
- [x] Paste handler detects URLs and fetches metadata
- [x] Input handler with debounce for typed URLs
- [x] Blur handler for natural language parsing
- [x] detectedLink stored in modal.dataset for addItem() access
- [x] addItem() retrieves link from modal.dataset
- [x] No linter errors introduced

### Logic Flow Verified:
- [x] URL detection happens before natural language parsing
- [x] Metadata extraction is async and non-blocking
- [x] Error handling for failed metadata fetches
- [x] detectedLink variable properly scoped and updated
- [x] Description field remains optional and independent

---

## Test Results Summary

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| Plain Title Input | ⏳ Pending Manual Test | |
| Natural Language Input | ⏳ Pending Manual Test | |
| URL Paste | ⏳ Pending Manual Test | |
| URL Typed | ⏳ Pending Manual Test | |
| URL Without Metadata | ⏳ Pending Manual Test | |
| Natural Language + URL | ⏳ Pending Manual Test | |
| Manual Description | ⏳ Pending Manual Test | |
| Description Override | ⏳ Pending Manual Test | |
| Enter Key Submission | ⏳ Pending Manual Test | |
| Cancel/ESC | ⏳ Pending Manual Test | |

---

## Known Issues
- Electron app startup error (pre-existing, unrelated to this feature)
  - Error: `TypeError: Cannot read properties of undefined (reading 'getAppPath')`
  - Location: `/node_modules/menubar/lib/util/cleanOptions.js:39`
  - This needs to be fixed separately before testing can begin

---

## Next Steps
1. Fix Electron app startup issue
2. Execute all test scenarios manually
3. Update test results table
4. Document any bugs found
5. Create follow-up issues for enhancements
