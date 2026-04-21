
# FitForm - AI Pose Detection Fitness App 🏋️

🌐 **Live Demo:** [https://calisthenics-trainer.com/](https://calisthenics-trainer.com/)

Real-time exercise form analysis using AI pose detection. Get instant feedback on your workout form and track your progress.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose-green)

## Features ✨

### 🎯 Real-time Form Analysis
- **AI Pose Detection** - Uses MediaPipe Pose to detect body landmarks
- **Instant Feedback** - Get real-time corrections on your form
- **Score System** - Weighted scoring (Body: 40%, Elbow: 40%, Smoothness: 20%)

### 📊 Smart Rep Counting
- **Hysteresis-based Phase Detection** - Prevents jitter between up/down phases
- **Rep Validation** - Only counts reps with proper depth
- **Quality Tracking** - Distinguishes between "Perfect" and "Good" reps

### 🎥 Workout Recording
- **Auto-record** - Automatically records your workout session
- **Video Playback** - Review your form after workout
- **Download** - Save videos in WebM format

### 📱 Mobile-Friendly
- **Landscape Mode** - Optimized fullscreen workout view
- **Overlay UI** - See feedback without looking away from camera
- **Responsive Design** - Works on desktop and mobile

## Supported Exercises

| Exercise | Status | Features |
|----------|--------|----------|
| Push-up | ✅ Ready | Full form analysis, rep counting, video recording |
| More coming soon... | 🚧 | - |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Pose Detection**: MediaPipe Pose
- **Styling**: Tailwind CSS
- **PWA**: Service Worker ready

## Getting Started

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/kiwabc123/calisthenicsForEveryOne.git
cd calisthenicsForEveryOne

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Usage

1. **Navigate** to Push-up exercise page
2. **Set target** reps (5, 10, 15, 20, or 30)
3. **Click** "เริ่มออกกำลังกาย" to start
4. **Position** your camera to see your body from the side
5. **Click** "เต็มจอ" for landscape fullscreen mode
6. **Perform** push-ups and get real-time feedback
7. **Click** "หยุด" to finish and download your workout video

## Form Analysis Details

### Push-up Checkpoints

| Check | Good Form | Feedback |
|-------|-----------|----------|
| Body Alignment | 160°-180° | Straight body line |
| Elbow (Down) | 70°-110° | Proper depth |
| Elbow (Up) | 150°+ | Full extension |
| Hip Position | No sag/pike | Core engaged |

### Scoring Weights
- **Body Alignment**: 40% - Core stability is crucial
- **Elbow Position**: 40% - Proper depth and extension
- **Smoothness**: 20% - Controlled movement

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home page
│   └── exercise/
│       └── push-up/
│           └── page.tsx      # Push-up workout page
├── components/
│   ├── PoseCamera.tsx        # Camera + pose detection
│   ├── FeedbackPanel.tsx     # Form feedback display
│   └── RepCounter.tsx        # Rep counter component
├── lib/
│   ├── poseDetection.ts      # Pose utilities
│   └── pushUpAnalyzer.ts     # Push-up form analysis
└── types/
    └── exercise.ts           # TypeScript types
```

## Contributing

Contributions are welcome! Feel free to:
- Add new exercises
- Improve form detection algorithms
- Enhance UI/UX
- Fix bugs

## License

MIT

---

Made with 💪 for fitness enthusiasts
