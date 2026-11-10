# CMS v2 capability map (old "📢 HighLevel API" workflow luqGQ154hrSvAf4n)

Snapshot taken 2026-11-10. The workflow has 60 nodes and 4 triggers: the CMS MCP, Hermes Access and IT Helper Access MCP triggers, plus the GHL Notifications webhook. Five sub-agents (Contacts, Conversations, Calendar, Task, Invoice) call about 46 HTTP tools through ghl-api-proxy, which uses a shared secret and a user_id from the request body.
Usage: 70 runs since Oct 27 (60 succeeded, 10 failed). Runs aren't broken down per action, so the "use" column below is not measured yet.

Legend: R = read, W = write, Risk L/M/H. "v2" = already in CMS v2.

## Slice A — Contacts, tags, tasks
| Action | Endpoint | R/W | Risk | v2 |
|---|---|---|---|---|
| Search Contacts | POST /contacts/search | R | L | yes |
| Get Contact | GET /contacts/{id} | R | L | yes |
| Get Contacts By BusinessId | GET /contacts/business/{id} | R | L | |
| Create Contact | POST /contacts/ | W | M | |
| Upsert Contact | POST /contacts/upsert | W | M | |
| Update Contact | PUT /contacts/{id} | W | M | |
| Delete Contact | DELETE /contacts/{id} | W | H | |
| Add / Remove Tags | POST/DELETE /contacts/{id}/tags | W | L | |
| Tasks: list/get | /contacts/{id}/tasks[/{taskId}] | R | L | |
| Tasks: create/update/complete | same | W | L | |
| Task delete | same | W | M | |

## Slice B — Conversations
| Search / Get Conversation | /conversations/search, /{id} | R | L | |
| Create / Update Conversation | /conversations/ | W | M | |
| Delete Conversation | /conversations/{id} | W | H | |
| Send New Message | POST /conversations/messages | W | H (reaches the customer) | |

## Slice C — Calendars
| Get Calendars / Calendar / Events / Appointment / Free & Blocked Slots | /calendars/... | R | L | |
| Create / Update Appointment, Block Slot | /calendars/events/... | W | M | |
| Delete Event, Create / Delete Calendar | /calendars/... | W | H | |

## Not yet in the approved order
- **Invoices** (List/Get/Settings R; Create/Update W-M; Send/Void/Record Payment/Delete W-H). Proposed as Slice E.
- **Opportunities** (Slice D) — the old workflow has **no** opportunity tools, so this slice would be new functionality.
- **GHL Notifications webhook + Notification Agent + Spark DM/Toast**: incoming HighLevel events go to the app. This is not a chat tool, so it has to move separately before the old workflow can be turned off.
- `blank`, `blank1`, `blank2`: empty placeholder nodes. Drop them.

## Confirmation rule (decided)
Every W action returns "needs confirmation" unless the user has turned on "skip confirmations" in Settings > Integrations. ghl-* functions check that setting on the server for the user in the signed note; the AI's request can't change it. H actions also show a clear summary of what will happen.
