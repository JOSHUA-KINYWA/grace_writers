# Old Order Files Deletion Feature

## Overview
Admins can now delete old order files from the system and database, freeing up storage space.

## Components Created

### 1. API Endpoint: `/api/admin/delete-old-files`
- **Location**: `app/api/admin/delete-old-files/route.ts`
- **Methods**:
  - **GET**: Preview files that would be deleted (with admin check)
    - Query parameter: `daysOld` (default: 30)
    - Returns: Count and sample of files to be deleted
  - **POST**: Execute deletion (with admin check)
    - Request body: `{ daysOld: number }` (default: 30)
    - Deletes files from storage and updates database
    - Returns: Summary of deleted files and updated records

### 2. UI Component: `DeleteOldFilesPanel`
- **Location**: `components/admin/DeleteOldFilesPanel.tsx`
- **Features**:
  - Set threshold (days old)
  - Preview files before deletion
  - Execute bulk deletion
  - Display results with error handling
  - Show sample of files to be deleted

### 3. Integration
- Added to admin settings page: `app/admin/(dashboard)/settings/page.tsx`
- Accessible only to users with `admin` role

## How It Works

1. Admin sets the number of days (e.g., 30 days old)
2. Admin clicks "Preview" to see what files will be deleted
3. Admin reviews the count and sample files
4. Admin clicks "Delete All Old Files" to execute
5. System deletes files from:
   - Supabase storage bucket (`order-files`)
   - Database records in:
     - `order_messages` (sets `file_attachments` to null)
     - `revision_files` (deletes records)
     - `orders` (sets `deliverables` to null)

## Database Updates
- **order_messages**: `file_attachments` column is cleared
- **revision_files**: Entire records are deleted
- **orders**: `deliverables` column is cleared

## Security
- Admin authorization required (checks `user.user_metadata?.role === 'admin'`)
- Confirmation prompt before deletion
- Returns detailed error logs
- Uses Supabase service role for server-side operations

## Error Handling
- Graceful error handling for storage deletion failures
- Continues processing other files if some fail
- Returns list of errors encountered
- Shows user-friendly error messages

## Usage Example

### Preview files to be deleted (30+ days old)
```bash
curl -X GET \
  "http://localhost:3000/api/admin/delete-old-files?daysOld=30" \
  -H "Authorization: Bearer {admin_token}"
```

### Delete files (30+ days old)
```bash
curl -X POST \
  "http://localhost:3000/api/admin/delete-old-files" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{ "daysOld": 30 }'
```

## Files Modified
- Created: `app/api/admin/delete-old-files/route.ts` (NEW API)
- Created: `components/admin/DeleteOldFilesPanel.tsx` (NEW UI)
- Modified: `app/admin/(dashboard)/settings/page.tsx` (Added import and component)

## Future Enhancements
- Schedule automatic cleanup of files older than X days
- Add detailed logs for deleted files
- Archive files to cold storage instead of deleting
- Granular selection by order type, date range, etc.
