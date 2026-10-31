# Aegis Vision

Build a modern, production-ready React web dashboard for an AI-powered Face Recognition & Attendance Management System.

Theme:

- Minimal

- Professional

- Enterprise

- Similar to Azure, AWS Console, or Hikvision AI Dashboard

- White + Blue + Dark Gray theme

- Rounded cards

- Glassmorphism where appropriate

- Responsive design

- Material UI or Shadcn UI

- React + TypeScript

- React Router

- Axios for API calls

- React Query (TanStack Query)

- Zustand for state management

- Recharts for analytics

- React Hook Form

- Framer Motion animations

The dashboard will connect with an existing FastAPI backend.

-----------------------------------

LOGIN

-----------------------------------

Simple login page with

Email

Password

Forgot Password

Company Logo

Sign In button

-----------------------------------

DASHBOARD

-----------------------------------

Top Navigation

- Company Logo

- Search

- Notifications

- User Profile

Left Sidebar

Dashboard

Live Recognition

Register Person

People Database

Attendance

Cameras

Analytics

Settings

Dashboard cards

Today's Attendance

Registered People

Online Cameras

Recognized Today

Unknown Faces

Recognition Accuracy

Charts

Attendance Trend

Recognitions per Hour

Recent Activity

Recent Recognitions Table

Name

Camera

Time

Confidence

Status

-----------------------------------

LIVE RECOGNITION PAGE

-----------------------------------

Large live camera stream

Bounding boxes over detected faces

Display

Person Name

Confidence

Track ID

Attendance Status

Camera Name

Show green box for recognized person

Yellow box for unknown

Red box for unauthorized person

Right panel

Live Recognized People

Unknown People

Current FPS

Detection Time

Recognition Time

Track Count

Buttons

Start Camera

Stop Camera

Reconnect

Fullscreen

Snapshot

-----------------------------------

REGISTER PERSON

-----------------------------------

Modern registration form

Name

Employee ID

Email

Department

Designation

Phone Number

Upload Profile Image

Upload Additional Images

Live Camera Capture

Preview uploaded images

Show cropped detected face

Register button

Progress indicator while uploading

Success animation

-----------------------------------

PEOPLE DATABASE

-----------------------------------

Data table

Profile Photo

Name

Employee ID

Department

Email

Registered Date

Status

Actions

View

Edit

Delete

Search

Filter

Pagination

-----------------------------------

PERSON DETAILS

-----------------------------------

Profile Card

Profile Photo

Name

Department

Email

Employee ID

Phone

Face Images Gallery

Embedding Information

Attendance History

-----------------------------------

ATTENDANCE

-----------------------------------

Table

Employee

Date

Check In

Check Out

Working Hours

Status

Filters

Export CSV

Export Excel

Export PDF

-----------------------------------

CAMERAS

-----------------------------------

Camera Cards

Camera Name

RTSP URL

Status

Resolution

FPS

Buttons

Add Camera

Edit Camera

Delete Camera

Preview Camera

-----------------------------------

ANALYTICS

-----------------------------------

Recognition Accuracy

Attendance Percentage

Unknown Faces

Peak Detection Time

Most Active Camera

Department Attendance

Heatmap

Line Charts

Pie Charts

-----------------------------------

SETTINGS

-----------------------------------

System Settings

Face Match Threshold

Recognition Threshold

Attendance Cooldown

RTSP Timeout

Theme

Dark Mode

API Configuration

-----------------------------------

API STRUCTURE

-----------------------------------

Backend is FastAPI.

Available APIs include

POST /register

POST /recognize

GET /attendance

GET /employees

POST /employees

DELETE /employees/{id}

GET /cameras

POST /cameras

All API calls should be separated inside

src/api

-----------------------------------

PROJECT STRUCTURE

-----------------------------------

src/

components/

pages/

hooks/

services/

api/

types/

utils/

layouts/

assets/

-----------------------------------

EXTRA FEATURES

-----------------------------------

Loading Skeletons

Toast Notifications

Error Boundaries

Responsive Mobile Layout

Breadcrumbs

Pagination

Search

Sorting

Confirmation Dialogs

Image Preview Modal

Dark Mode

Profile Menu

Keyboard Shortcuts

Professional Icons

-----------------------------------

DESIGN

-----------------------------------

Create a premium enterprise UI similar to

Azure Portal

AWS Console

Hikvision AI Dashboard

Axis Camera Station

Milestone XProtect

Use modern cards, gradients, smooth transitions, and clean typography.

The interface should feel like a commercial AI surveillance product rather than a student project.  and use 3js in every possible page and like when user scan face and pop up with name and timing and all through 3js library

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aegis-face-insight.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9336211a-3886-460d-aeb7-49086f7cbfd5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
