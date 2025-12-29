# **App Name**: Traitors Command

## Core Features:

- Event & Round Management: Create and manage events (THE TRAITORS 2026) and rounds (Qualifier, Semi-Final 1, Semi-Final 2, Final).
- Traitor Assignment: Randomly select one House (A-F) as Traitor per round and store it securely.
- Word Assignment: Assign a Common Word and a Traitor Word, hidden from public view until reveal.
- Timer System: Moderator-controlled countdown timer per phase, synced across all clients, auto-locking phase on completion.
- Voting Outcome Input: Manual input of voting results from Google Forms, with automatic result calculation (Traitor Caught/Not Caught, House voted out).
- Scoring Engine: Maintain scoreboard, support points for catching Traitor, penalties, bonus points, and manual penalty toggles, with auto-update and persistence.
- Round Summary Generator: At the end of a round generate a summary of events (Traitor house, Outcome, Points awarded, Timestamp), leveraging an LLM as a tool to decide if certain events should be included in the generated round summary to enhance engagement

## Style Guidelines:

- Dark, high-contrast theme in game show style. Background color: Dark charcoal (#222222).
- Primary color: Electric Purple (#7B1FA2) for a vibrant, commanding presence.
- Accent color: Cyber Yellow (#FFDA63), complementing the purple and providing a stark contrast.
- Headline font: 'Space Grotesk' sans-serif for headings, matched with 'Inter' sans-serif for body text.
- Bold, clear icons for game actions and status indicators, such as start, pause, voting, reveal, penalty, etc.
- Split-screen layout: Moderator Dashboard (left) and Public Display Screen (right). Each section optimized for its role.
- Subtle animations for timer updates and score changes. Highlighting on critical events.