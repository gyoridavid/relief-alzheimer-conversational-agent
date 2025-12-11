# Relief - A Virtual Presence Agent for Alzheimer's Caregivers

> [!NOTE]
> This project was created for the [ElevenLabs World Wide Hackathon 2025 (Taipei)](https://hackathon.elevenlabs.io/). This whole project was built in 2.5 hours (!) during the hackathon. It is a prototype and should not be used in real-world caregiving situations without further development and testing.

[![Watch the demo video](https://img.youtube.com/vi/pzxFNSMEp88/0.jpg)](https://www.youtube.com/watch?v=pzxFNSMEp88)

For over 10 years, Miri watched her grandmother’s Alzheimer’s progress and her mother devote herself completely to caring for her. Supporting a loved one with Alzheimer’s is both emotionally and physically demanding. As memory and reasoning fade, simple conversations and repetitive questions can turn into moments of confusion or frustration for both the individual and the caregiver. On top of this, caregivers often feel they must be constantly present. Over time, that unrelenting pressure can lead to deep stress, exhaustion, and burnout.

As assistive technology continues to evolve—and with [emerging research](https://pmc.ncbi.nlm.nih.gov/articles/PMC8325086/) on conversational agents designed to support people with dementia and their caregivers—we saw an opportunity. We imagined an AI tool that could help ease both sides of the experience: creating calmer, more patient interactions for the person with Alzheimer’s, while giving caregivers space to step away when needed without guilt.

**Relief** is a multimodal Virtual Presence Agent that uses advanced voice and vision capabilities to offer real-time, familiar-feeling conversations for people with Alzheimer’s. When a primary caregiver can’t be present, Relief provides comforting, supportive interactions—offering reassurance for loved ones and meaningful peace of mind for caregivers.

## How to run the project

✅ Clone the repository
✅ Install dependencies with `pnpm install`

✅ Use the [n8n template](misc/n8n_template.json) to set up your own n8n webhook to analyze webcam images with GPT-5-mini and copy the webhook URL

✅ Setup the ElevenLabs Agent

- Create a new ElevenLabs Agent with the provided [system prompt](misc/elevenlabs_agent_system_prompt.md), for the first message, add `Hi Mom, I'm here on the phone if you need me`
- Add a new subagent
- Create a new client tool called `sleep` with the following configuration:
  - Tool Name: `sleep`
  - Description: `Puts the agent to sleep mode, where it will not respond until the user speaks again. Use this tool when the user has been silent for a while.`
  - No parameters
- In the agent settings, under the `Conversational behaviour` set the `Eagerness` to `Patient` and the `Take turn after silence` to `-1`.
- Copy the Agent ID

✅ Make a copy of the `.env.example` file and rename it to `.env`, then fill in the required environment variables

✅ Lastly, run the project with `pnpm dev`

<table>
  <tbody>
    <tr>
      <td><img src="https://github.com/user-attachments/assets/97245358-52e6-40eb-a308-ed24a35cebcc" /></td>
      <td><img src="https://github.com/user-attachments/assets/4bcbe4d3-055b-429a-8bfa-013d861dd079" /></td>
      <td><img src="https://github.com/user-attachments/assets/cb1a5c53-cc96-4ad8-957b-1402d5c769db" /></td>
    </tr>
  </tbody>
</table>

## Environment Variables

- `VITE_ELEVENLABS_AGENT_ID` - The ElevenLabs Agent ID you created
- `VITE_WEBHOOK_URL` - The n8n webhook URL to upload webcam images
- `VITE_SILENCE_TIMEOUT_MS` - (Optional) The silence timeout in milliseconds (default: 10000). This controls how long the agent waits in silence before sending some conversation starters to re-engage the patient.
- `VITE_WEBCAM_INTERVAL_MS` - (Optional) The webcam image upload interval in milliseconds (default: 5000). This controls how often the webcam image is captured and sent to the n8n webhook for analysis.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **State Management**: Zustand
- **ElevenLabs**: ElevenLabs Agents
- **Webcam Service**: Custom service to capture and upload webcam images to an n8n webhook and analyze them with GPT-5-mini. n8n was chosen for the "backend" as we wanted to compete in the sponsored category (LOL) - not because that was the best tool for the job.
- **Tests**: Vitest, but none was written due to time constraints :)

## Features

- Reply to the patient's repeated questions with patience and empathy
- Give the EleventhLabs agent the ability to "see" the patient via webcam image analysis
- Keep up the conversation when the patient is silent for a while
- When the patient mentions that they want to sleep or rest, the agent will go into "sleep mode" and stop asking questions until the patient speaks again
