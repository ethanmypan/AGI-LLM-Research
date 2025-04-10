// arc_llm_solver.js
// Enhanced system for automated LLM solving of ARC tasks with improved UI interaction

class ARCLLMSolver {
    constructor() {
      this.results = [];
      this.currentTaskName = '';
      this.currentTaskIndex = 0;
      this.totalTasks = 0;
      this.batchMode = false;
      this.taskQueue = [];
      this.processingQueue = false;
      this.solverOptions = {
        model: "gpt-4o",
        temperature: 0.2,
        maxRetries: 2
      };
    }
  
    // Generate an optimized prompt for the LLM
    formatPrompt(taskJson) {
      let prompt = "You are solving an Abstract Reasoning Challenge (ARC) task. Your goal is to identify the pattern transformation from input to output.\n\n";
      
      // Add training examples with clear formatting
      prompt += "# Training Examples\n";
      taskJson.train.forEach((pair, i) => {
        prompt += `## Example ${i + 1}\n`;
        prompt += "Input:\n";
        prompt += this.formatGrid(pair.input);
        prompt += "\nOutput:\n";
        prompt += this.formatGrid(pair.output);
        prompt += "\n\n";
      });
      
      // Add test input with clear instruction
      prompt += "# Test\n";
      prompt += "Input:\n";
      prompt += this.formatGrid(taskJson.test[0].input);
      
      // Give explicit instructions
      prompt += "\n\nAnalyze the pattern transformation in the training examples and apply it to the test input. Think step by step:\n";
      prompt += "1. What changes between each input and output?\n";
      prompt += "2. What operations are being applied (rotation, reflection, color change, etc.)?\n";
      prompt += "3. How can this pattern be applied to the test input?\n\n";
      prompt += "Return ONLY a JSON array representing the output grid. Example: [[0,1,2],[1,0,2]]\n";
      
      return prompt;
    }
    
    // Format a grid in a more visual way to help the LLM understand the spatial relationships
    formatGrid(grid) {
      let result = "";
      for (let row of grid) {
        result += JSON.stringify(row) + "\n";
      }
      return result;
    }
  
    // Process the current task
    async solveCurrentTask() {
      try {
        document.getElementById("info_display").innerText = `Processing task: ${this.currentTaskName}`;
        
        const taskJson = this.getCurrentTaskData();
        if (!taskJson.train || !taskJson.test || taskJson.train.length === 0) {
          throw new Error("Invalid task data or no task loaded");
        }
        
        const prompt = this.formatPrompt(taskJson);
        console.log("Prompt sent to LLM:", prompt);
        
        // Show solving status
        document.getElementById("gpt_output_text").innerText = "Solving in progress...";
        
        // Call the LLM with our options
        const output = await callGPT(prompt, this.solverOptions);
        
        // Try to parse the output as JSON
        let parsedOutput;
        try {
          // Extract JSON array from the response if it contains text
          const jsonMatch = output.match(/\[\s*\[.*\]\s*\]/s);
          if (jsonMatch) {
            parsedOutput = JSON.parse(jsonMatch[0]);
          } else {
            parsedOutput = JSON.parse(output);
          }
        } catch (parseErr) {
          console.error("Failed to parse LLM output:", parseErr);
          document.getElementById("gpt_output_text").innerText = 
            "Error parsing LLM output. Raw output:\n\n" + output;
          return false;
        }
        
        // Show the result
        document.getElementById("gpt_output_text").innerText = output;
        
        // Compare with ground truth
        const isCorrect = this.compareGrids(parsedOutput, taskJson.test[0].output);
        
        // Save result
        const result = {
          task_name: this.currentTaskName,
          gpt_output: parsedOutput,
          ground_truth: taskJson.test[0].output,
          is_correct: isCorrect,
          prompt: prompt,
          raw_response: output,
          timestamp: new Date().toISOString()
        };
        
        this.results.push(result);
        
        // Update the UI
        CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(parsedOutput);
        syncFromDataGridToEditionGrid();
        $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
        
        const resultMessage = isCorrect ? 
          "✅ Solved correctly!" : 
          "❌ Incorrect solution";
        
        document.getElementById("info_display").innerText = 
          `${resultMessage} Task: ${this.currentTaskName}`;
        
        // Add a visual cue to the result panel
        if (isCorrect) {
          $("#gpt_solution_box").css("border-left", "4px solid var(--success-color)");
        } else {
          $("#gpt_solution_box").css("border-left", "4px solid var(--danger-color)");
        }
        
        // Return whether the solution was correct
        return isCorrect;
      } catch (err) {
        console.error("Error solving task:", err);
        document.getElementById("info_display").innerText = "Error during LLM call: " + err.message;
        document.getElementById("gpt_output_text").innerText = "Error: " + err.message;
        $("#gpt_solution_box").css("border-left", "4px solid var(--danger-color)");
        return false;
      }
    }
    
    // Get current task data
    getCurrentTaskData() {
      const taskJson = { train: [], test: [] };
      
      // Get training examples
      $(".pair_preview").each(function (index, element) {
        const inputGrid = convertJqGridToArray($(element).find('.input_preview'));
        const outputGrid = convertJqGridToArray($(element).find('.output_preview'));
        taskJson.train.push({ input: inputGrid, output: outputGrid });
      });
      
      // Get test input/output
      if (TEST_PAIRS.length > 0) {
        taskJson.test.push({ 
          input: CURRENT_INPUT_GRID.grid, 
          output: TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'] 
        });
      }
      
      return taskJson;
    }
    
    // Compare two grids for equality
    compareGrids(grid1, grid2) {
      if (!grid1 || !grid2) return false;
      if (grid1.length !== grid2.length) return false;
      
      for (let i = 0; i < grid1.length; i++) {
        if (grid1[i].length !== grid2[i].length) return false;
        for (let j = 0; j < grid1[i].length; j++) {
          if (grid1[i][j] !== grid2[i][j]) return false;
        }
      }
      return true;
    }
    
    // Download all results
    downloadResults() {
      if (this.results.length === 0) {
        infoMsg("No results to download yet. Solve some tasks first!");
        return;
      }
      
      const summary = {
        timestamp: new Date().toISOString(),
        total_tasks: this.results.length,
        correct_count: this.results.filter(r => r.is_correct).length,
        accuracy: this.results.filter(r => r.is_correct).length / this.results.length,
        model: this.solverOptions.model,
        temperature: this.solverOptions.temperature,
        results: this.results
      };
      
      // Create a more descriptive filename
      const accuracyPct = Math.round((summary.accuracy * 100));
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `arc_${this.solverOptions.model}_acc${accuracyPct}pct_${timestamp}.json`;
      
      downloadJSON(summary, filename);
      infoMsg(`Results downloaded: ${this.results.length} tasks, ${accuracyPct}% accuracy`);
    }
    
    // Start batch mode to process multiple tasks
    async startBatchProcessing(taskUrls) {
      if (this.processingQueue) {
        alert("Already processing a batch. Please wait.");
        return;
      }
      
      this.batchMode = true;
      this.processingQueue = true;
      this.taskQueue = taskUrls || [];
      this.results = [];
      this.currentTaskIndex = 0;
      this.totalTasks = this.taskQueue.length;
      
      // Reset UI elements
      $("#gpt_solution_box").css("border-left", "none");
      $("#gpt_output_text").text("Batch processing started...");
      
      await this.processNextInQueue();
    }
    
    // Process the next task in the queue
    async processNextInQueue() {
      if (this.currentTaskIndex >= this.totalTasks) {
        // Queue completed
        this.processingQueue = false;
        const correctCount = this.results.filter(r => r.is_correct).length;
        const accuracyPct = Math.round((correctCount / this.totalTasks) * 100);
        
        document.getElementById("info_display").innerText = 
          `✅ Batch processing complete. ${correctCount}/${this.totalTasks} solved correctly (${accuracyPct}%).`;
        
        // Update the output text with summary
        document.getElementById("gpt_output_text").innerText = 
          `Batch Processing Summary:
          
  Total Tasks: ${this.totalTasks}
  Solved Correctly: ${correctCount}
  Accuracy: ${accuracyPct}%
  Model: ${this.solverOptions.model}
  Temperature: ${this.solverOptions.temperature}
  
  Download the complete results for detailed analysis.`;
        
        // Download results automatically
        this.downloadResults();
        return;
      }
      
      const taskUrl = this.taskQueue[this.currentTaskIndex];
      try {
        // Load the task
        await this.loadTaskFromUrl(taskUrl);
        
        // Update task index display
        this.currentTaskIndex++;
        document.getElementById("info_display").innerText = 
          `Processing task ${this.currentTaskIndex}/${this.totalTasks}: ${this.currentTaskName}`;
        
        // Solve it
        await this.solveCurrentTask();
        
        // Process next after a short delay
        setTimeout(() => this.processNextInQueue(), 1000);
        
      } catch (err) {
        console.error("Error processing task:", err);
        document.getElementById("info_display").innerText = 
          `Error processing task ${this.currentTaskIndex + 1}: ${err.message}`;
        
        // Continue with next task despite error
        this.currentTaskIndex++;
        setTimeout(() => this.processNextInQueue(), 1000);
      }
    }
    
    // Load a task from URL
    async loadTaskFromUrl(url) {
      return new Promise((resolve, reject) => {
        $.getJSON(url, (json) => {
          try {
            let train = json['train'];
            let test = json['test'];
            
            loadJSONTask(train, test);
            
            // Extract task name from URL
            const taskName = url.split('/').pop();
            this.currentTaskName = taskName;
            display_task_name(taskName, this.currentTaskIndex + 1, this.totalTasks);
            
            resolve();
          } catch (e) {
            reject(new Error('Bad file format'));
          }
        }).fail(() => {
          reject(new Error('Error loading task'));
        });
      });
    }
    
    // Load and process all tasks from GitHub
    async processAllGitHubTasks(subset = "training", limit = null) {
      try {
        document.getElementById("info_display").innerText = "Loading task list from GitHub...";
        
        const response = await fetch(`https://api.github.com/repos/fchollet/ARC/contents/data/${subset}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch task list: ${response.status}`);
        }
        
        let tasks = await response.json();
        
        // Shuffle the tasks for more representative results
        tasks = this.shuffleArray(tasks);
        
        // Limit the number of tasks if specified
        if (limit && limit > 0) {
          tasks = tasks.slice(0, limit);
        }
        
        // Prepare the task queue
        const taskUrls = tasks.map(task => task.download_url);
        
        document.getElementById("info_display").innerText = 
          `Starting batch processing of ${taskUrls.length} tasks...`;
        
        // Start batch processing
        await this.startBatchProcessing(taskUrls);
        
      } catch (err) {
        console.error("Error loading tasks from GitHub:", err);
        document.getElementById("info_display").innerText = "Error loading task list: " + err.message;
      }
    }
    
    // Shuffle an array (for random task selection)
    shuffleArray(array) {
      let currentIndex = array.length, randomIndex;
      
      // While there remain elements to shuffle
      while (currentIndex != 0) {
        // Pick a remaining element
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        
        // And swap it with the current element
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      
      return array;
    }
    
    // Change solver settings
    setOptions(options) {
      this.solverOptions = {...this.solverOptions, ...options};
      console.log("Solver options updated:", this.solverOptions);
      return this.solverOptions;
    }
  }
  
  // Initialize the solver
  const arcSolver = new ARCLLMSolver();
  
  // Function to be called when "Solve Current Task with LLM" button is clicked
  async function askLLMForSolution() {
    arcSolver.currentTaskName = $('#task_name').text().replace("Task name:", "").trim();
    await arcSolver.solveCurrentTask();
  }
  
  // Function to start batch processing with a limit
  async function startBatchProcessing(limit = 5) {
    await arcSolver.processAllGitHubTasks("training", limit);
  }
  
  // Function to download current results
  function downloadCurrentResults() {
    arcSolver.downloadResults();
  }