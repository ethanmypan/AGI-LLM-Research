# AGI-LLM-Research# ARC LLM Solver

This project extends the original ARC (Abstraction and Reasoning Corpus) Testing Interface with automated LLM solving capabilities, allowing you to test various language models on ARC tasks.

## Features

- Load and visualize ARC tasks from files or GitHub repository
- Solve individual tasks using LLMs like GPT-4
- Run batch processing on multiple tasks
- Download and analyze results
- Compare LLM solutions with ground truth
- Interactive UI for manually solving tasks

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/arc-llm-solver.git
cd arc-llm-solver
```

2. Install dependencies:
```bash
npm install express dotenv node-fetch
```

3. Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

4. Update your project structure to match:
```
project_root/
├── server.js
├── .env
├── public/
│   ├── index.html
│   ├── css/
│   │   ├── common.css
│   │   └── testing_interface.css
│   └── js/
│       ├── common.js
│       ├── testing_interface.js
│       ├── openai_api.js
│       └── arc_llm_solver.js
```

## Usage

### Start the Server

```bash
node server.js
```

Then navigate to `http://localhost:3000` in your web browser.

### Using the Interface

1. **Load a Task**:
   - Click "Browse..." to load a task from your local files
   - Click "Random task" to load a random task from the ARC GitHub repository

2. **Solve with LLM**:
   - Click "Solve Current Task with LLM" to solve the currently loaded task
   - The solution will be displayed in the output grid and results panel

3. **Batch Processing**:
   - Click "Process 5 Random Tasks" or "Process 20 Random Tasks" to run batch processing
   - Results will be automatically saved when batch processing completes

4. **Download Results**:
   - Click "Download Results" to download the results as JSON file

### Modifying LLM Prompts

You can customize the prompt strategy in the `formatPrompt` method in `arc_llm_solver.js`:

```javascript
formatPrompt(taskJson) {
  // Modify this method to experiment with different prompting strategies
  // ...
}
```

## Project Structure

- `server.js`: Express server handling API calls to OpenAI
- `public/index.html`: Main HTML interface
- `public/js/arc_llm_solver.js`: Core solver logic and batch processing
- `public/js/openai_api.js`: API wrapper for OpenAI calls
- `public/js/testing_interface.js`: Original ARC interface functionalities
- `public/js/common.js`: Shared utilities

## Extending the Project

Here are some ideas for extending the project:

1. Support for other LLM providers (Claude, Gemini, etc.)
2. Add visualization of result statistics
3. Implement advanced prompting techniques like chain-of-thought or few-shot learning
4. Create an experiment framework for comparing different prompting strategies
5. Add logic to automatically analyze why certain tasks fail

## License

This project extends the original ARC testing interface by François Chollet. Please check the original repository for license details: [https://github.com/fchollet/ARC](https://github.com/fchollet/ARC)