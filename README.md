# Reddit Activity Viewer - Chrome / Firefox Extension

**Reddit Activity Viewer** is an extension that allows users to explore detailed data about a Reddit user's activity. By simply entering a Reddit username or clicking the 'Get Activity' button beside the accounts username, the extension provides insights into their account creation date, total posts, total comments, most active subreddits, and their best and worst comments. It displays all of this information in an easy-to-use and intuitive interface.

This guide will help you set up and run the Reddit Activity Viewer extension, as well as explain the key components of the project.

---

## Features
- **Account Overview**: Displays account creation date, total posts/comments, average posts/comments per day.
- **Most Active Subreddits**: Lists subreddits where the user is most active.
- **Activity Breakdown**: See the user’s activity from the last 7 days, including posts and comments.
- **Top Upvoted/Downvoted Comments**: Highlights the user's best and worst comments by upvote/downvote count.
- **Most Used Words**: Provides a list of the most frequently used words in posts/comments.
- **Yearly Stats**: Offers yearly breakdowns of the user’s activity.

---

## Setup Guide

### 1.) Clone the Repository

- First, clone the repository to your local machine:

      git clone https://github.com/David-Lamonaca/reddit_activity_viewer.git

- Second, navigate to the project directory

      cd reddit-activity-viewer

### 2.) Install Backend

The backend service is responsible for fetching and processing the Reddit user data. You will need to set up and configure it.

- First, create a .env file in the root directory of the backend project with the following variables.
```bash
  CLIENT_IDS=YOUR_REDDIT_APP_CLIENT_ID (OR IDS IF YOU MADE MULTIPLE, COMMA SEPERATED)
  CLIENT_SECRETS=YOUR_REDDIT_APP_CLIENT_SECRET (OR SECRETS IF YOU MADE MULTIPLE,COMMA SEPERATED)
  USER_AGENTS=A UNIQUE STRING (OR UNIQUE STRINGS IF YOU MADE MULTIPLE, COMMA SEPERATED)
  HOST=0.0.0.0
  PORT=5000
  STOP_WORDS=this,is,a,comma,seperated,list,of,words,you,want,the,most,used,words,list,to,ignore
```
- Second, install the necessary dependencies.
```bash
  cd backend
  npm install
```
- Third, run the backend server.
```bash
node index.js
```
- Fourth, alternative option to the second and third step, if you have docker installed.
```bash
cd backend
docker-compose build
docker-compose up
```

### 3.) Configure Frontend

The frontend is a Chrome / Firefox extension that communicates with the backend to display the Reddit user data. Here's how to configure it.

- First, create the config.js file in the root directory of the frontend project with the following content
```bash
  const CONFIG =
  {
    BACKEND_URL: 'http://localhost:5000' // Replace with the correct backend URL
  };
  export default CONFIG;
```
- Second, load the extension in Chrome / Firefox.
  - Open Chrome and navigate to chrome://extensions/.
  - Enable Developer mode at the top right.
  - Click Load unpacked and select the frontend directory.
  -
  - Open Firefox and navigate to about:debugging#/runtime/this-firefox
  - Click Load Temporary Add-on... and select the manifest.json file.

This will install the extension locally for testing.

---

## Usage

1.) Once the extension is loaded, click on the Reddit Activity Viewer icon in the Chrome toolbar to open the popup.

2.) Enter a Reddit username in the input field. Click the Search button, and the extension will retrieve and display the user's activity.

3.) Alternatively, navigate to https://www.reddit.com/ and click the 'Get Activity' button beside an accounts username.

---

