// testing_interface.js

class Grid {
    constructor(height, width, values) {
        this.height = height;
        this.width = width;
        this.grid = new Array(height);
        for (var i = 0; i < height; i++){
            this.grid[i] = new Array(width);
            for (var j = 0; j < width; j++){
                if (values !== undefined && values[i] !== undefined && values[i][j] !== undefined){
                    this.grid[i][j] = values[i][j];
                } else {
                    this.grid[i][j] = 0;
                }
            }
        }
    }
}

// Internal state.
var CURRENT_INPUT_GRID = new Grid(3, 3);
var CURRENT_OUTPUT_GRID = new Grid(3, 3);
var TEST_PAIRS = [];
var CURRENT_TEST_PAIR_INDEX = 0;
var COPY_PASTE_DATA = [];

// Cosmetic.
var EDITION_GRID_HEIGHT = 500;
var EDITION_GRID_WIDTH = 500;
var MAX_CELL_SIZE = 100;

function resetTask() {
    CURRENT_INPUT_GRID = new Grid(3, 3);
    TEST_PAIRS = [];
    CURRENT_TEST_PAIR_INDEX = 0;
    $('#task_preview').html('');
    resetOutputGrid();
}

function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function refreshEditionGrid(jqGrid, dataGrid) {
    fillJqGridWithData(jqGrid, dataGrid);
    setUpEditionGridListeners(jqGrid);
    fitCellsToContainer(jqGrid, dataGrid.height, dataGrid.width, EDITION_GRID_HEIGHT, EDITION_GRID_HEIGHT);
    initializeSelectable();
}

function syncFromEditionGridToDataGrid() {
    copyJqGridToDataGrid($('#output_grid .edition_grid'), CURRENT_OUTPUT_GRID);
}

function syncFromDataGridToEditionGrid() {
    refreshEditionGrid($('#output_grid .edition_grid'), CURRENT_OUTPUT_GRID);
}

function getSelectedSymbol() {
    let selected = $('#symbol_picker .selected-symbol-preview')[0];
    return $(selected).attr('symbol');
}

function setUpEditionGridListeners(jqGrid) {
    jqGrid.find('.cell').click(function(event) {
        let cell = $(event.target);
        let symbol = getSelectedSymbol();
        let mode = $('input[name=tool_switching]:checked').val();
        if (mode == 'floodfill') {
            syncFromEditionGridToDataGrid();
            let grid = CURRENT_OUTPUT_GRID.grid;
            floodfillFromLocation(grid, cell.attr('x'), cell.attr('y'), symbol);
            syncFromDataGridToEditionGrid();
        } else if (mode == 'edit') {
            setCellSymbol(cell, symbol);
        }
    });
}

function resizeOutputGrid() {
    let size = $('#output_grid_size').val();
    size = parseSizeTuple(size);
    let height = size[0];
    let width = size[1];
    let jqGrid = $('#output_grid .edition_grid');
    syncFromEditionGridToDataGrid();
    let dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(height, width, dataGrid);
    refreshEditionGrid(jqGrid, CURRENT_OUTPUT_GRID);
}

function resetOutputGrid() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = new Grid(3, 3);
    syncFromDataGridToEditionGrid();
    resizeOutputGrid();
}

function copyFromInput() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
}

function fillPairPreview(pairId, inputGrid, outputGrid) {
    let pairSlot = $('#pair_preview_' + pairId);
    if (!pairSlot.length) {
        pairSlot = $('<div id="pair_preview_' + pairId + '" class="pair_preview" index="' + pairId + '"></div>');
        pairSlot.appendTo('#task_preview');
    }
    let jqInputGrid = pairSlot.find('.input_preview');
    if (!jqInputGrid.length) {
        jqInputGrid = $('<div class="input_preview"></div>');
        jqInputGrid.appendTo(pairSlot);
    }
    let jqOutputGrid = pairSlot.find('.output_preview');
    if (!jqOutputGrid.length) {
        jqOutputGrid = $('<div class="output_preview"></div>');
        jqOutputGrid.appendTo(pairSlot);
    }
    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 200, 200);
    fillJqGridWithData(jqOutputGrid, outputGrid);
    fitCellsToContainer(jqOutputGrid, outputGrid.height, outputGrid.width, 200, 200);
}

function loadJSONTask(train, test) {
    resetTask();
    $('#modal_bg').hide();
    $('#error_display').hide();
    $('#info_display').hide();

    for (var i = 0; i < train.length; i++) {
        let pair = train[i];
        let values = pair['input'];
        let input_grid = convertSerializedGridToGridObject(values);
        values = pair['output'];
        let output_grid = convertSerializedGridToGridObject(values);
        fillPairPreview(i, input_grid, output_grid);
    }
    for (var i = 0; i < test.length; i++) {
        let pair = test[i];
        TEST_PAIRS.push(pair);
    }
    let values = TEST_PAIRS[0]['input'];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values);
    fillTestInput(CURRENT_INPUT_GRID);
    CURRENT_TEST_PAIR_INDEX = 0;
    $('#current_test_input_id_display').html('1');
    $('#total_test_input_count_display').html(test.length);
}

function display_task_name(task_name, task_index, number_of_tasks) {
    let big_space = '&nbsp;'.repeat(4);
    document.getElementById('task_name').innerHTML = (
        'Task name:' + big_space + task_name + big_space + (
            task_index === null ? '' :
            (String(task_index) + ' out of ' + String(number_of_tasks))
        )
    );
}

function loadTaskFromFile(e) {
    let file = e.target.files[0];
    if (!file) {
        errorMsg('No file selected');
        return;
    }
    let reader = new FileReader();
    reader.onload = function(e) {
        let contents = e.target.result;
        try {
            contents = JSON.parse(contents);
            let train = contents['train'];
            let test = contents['test'];
            loadJSONTask(train, test);
        } catch (e) {
            errorMsg('Bad file format');
            return;
        }
        $('#load_task_file_input')[0].value = "";
        display_task_name(file.name, null, null);
    };
    reader.readAsText(file);
}

function randomTask() {
    let subset = "training";
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
        let task_index = Math.floor(Math.random() * tasks.length);
        let task = tasks[task_index];
        $.getJSON(task["download_url"], function(json) {
            try {
                let train = json['train'];
                let test = json['test'];
                loadJSONTask(train, test);
            } catch (e) {
                errorMsg('Bad file format');
                return;
            }
            infoMsg("Loaded task training/" + task["name"]);
            display_task_name(task['name'], task_index, tasks.length);
        })
        .error(function(){
          errorMsg('Error loading task');
        });
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function nextTestInput() {
    if (TEST_PAIRS.length <= CURRENT_TEST_PAIR_INDEX + 1) {
        errorMsg('No next test input. Pick another file?');
        return;
    }
    CURRENT_TEST_PAIR_INDEX += 1;
    let values = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['input'];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values);
    fillTestInput(CURRENT_INPUT_GRID);
    $('#current_test_input_id_display').html(CURRENT_TEST_PAIR_INDEX + 1);
    $('#total_test_input_count_display').html(TEST_PAIRS.length);
}

function submitSolution() {
    syncFromEditionGridToDataGrid();
    let reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
    let submitted_output = CURRENT_OUTPUT_GRID.grid;
    if (reference_output.length != submitted_output.length) {
        errorMsg('Wrong solution.');
        return;
    }
    for (var i = 0; i < reference_output.length; i++){
        let ref_row = reference_output[i];
        for (var j = 0; j < ref_row.length; j++){
            if (ref_row[j] != submitted_output[i][j]) {
                errorMsg('Wrong solution.');
                return;
            }
        }
    }
    infoMsg('Correct solution!');
}

function fillTestInput(inputGrid) {
    let jqInputGrid = $('#evaluation_input');
    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 400, 400);
}

function copyToOutput() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
}

function initializeSelectable() {
    try {
        $('.selectable_grid').selectable('destroy');
    } catch (e) {}
    let toolMode = $('input[name=tool_switching]:checked').val();
    if (toolMode == 'select') {
        infoMsg('Select some cells and click on a color to fill in, or press C to copy');
        $('.selectable_grid').selectable({
            autoRefresh: false,
            filter: '> .row > .cell',
            start: function(event, ui) {
                $('.ui-selected').each(function(i, e) {
                    $(e).removeClass('ui-selected');
                });
            }
        });
    }
}

$(document).ready(function () {
    $('#symbol_picker').find('.symbol_preview').click(function(event) {
        let symbol_preview = $(event.target);
        $('#symbol_picker').find('.symbol_preview').each(function(i, preview) {
            $(preview).removeClass('selected-symbol-preview');
        });
        symbol_preview.addClass('selected-symbol-preview');
        let toolMode = $('input[name=tool_switching]:checked').val();
        if (toolMode == 'select') {
            $('.edition_grid').find('.ui-selected').each(function(i, cell) {
                let symbol = getSelectedSymbol();
                setCellSymbol($(cell), symbol);
            });
        }
    });

    $('.edition_grid').each(function(i, jqGrid) {
        setUpEditionGridListeners($(jqGrid));
    });

    $('.load_task').on('change', function(event) {
        loadTaskFromFile(event);
    });

    $('.load_task').on('click', function(event) {
      event.target.value = "";
    });

    $('input[type=radio][name=tool_switching]').change(function() {
        initializeSelectable();
    });
    
    $('input[type=text][name=size]').on('keydown', function(event) {
        if (event.keyCode == 13) {
            resizeOutputGrid();
        }
    });

    $('body').keydown(function(event) {
        if (event.which == 67) {
            let selected = $('.ui-selected');
            if (selected.length == 0) {
                return;
            }
            COPY_PASTE_DATA = [];
            for (var i = 0; i < selected.length; i ++) {
                let x = parseInt($(selected[i]).attr('x'));
                let y = parseInt($(selected[i]).attr('y'));
                let symbol = parseInt($(selected[i]).attr('symbol'));
                COPY_PASTE_DATA.push([x, y, symbol]);
            }
            infoMsg('Cells copied! Select a target cell and press V to paste at location.');
        }
        if (event.which == 86) {
            if (COPY_PASTE_DATA.length == 0) {
                errorMsg('No data to paste.');
                return;
            }
            let selected = $('.edition_grid').find('.ui-selected');
            if (selected.length == 0) {
                errorMsg('Select a target cell on the output grid.');
                return;
            }
            let jqGrid = $(selected.parent().parent()[0]);
            if (selected.length == 1) {
                let targetx = parseInt(selected.attr('x'));
                let targety = parseInt(selected.attr('y'));
                let xs = [];
                let ys = [];
                let symbols = [];
                for (var i = 0; i < COPY_PASTE_DATA.length; i ++) {
                    xs.push(COPY_PASTE_DATA[i][0]);
                    ys.push(COPY_PASTE_DATA[i][1]);
                    symbols.push(COPY_PASTE_DATA[i][2]);
                }
                let minx = Math.min(...xs);
                let miny = Math.min(...ys);
                for (var i = 0; i < xs.length; i ++) {
                    let x = xs[i];
                    let y = ys[i];
                    let symbol = symbols[i];
                    let newx = x - minx + targetx;
                    let newy = y - miny + targety;
                    let res = jqGrid.find('[x="' + newx + '"][y="' + newy + '"] ');
                    if (res.length == 1) {
                        let cell = $(res[0]);
                        setCellSymbol(cell, symbol);
                    }
                }
            } else {
                errorMsg('Can only paste at a specific location; only select *one* cell as paste destination.');
            }
        }
    });
});

function formatPrompt(taskJson) {
    let prompt = "You are given an ARC task.\n\n";
    prompt += "Training examples:\n";
    taskJson.train.forEach((pair, i) => {
        prompt += `Example ${i + 1}:\nInput:\n${JSON.stringify(pair.input)}\nOutput:\n${JSON.stringify(pair.output)}\n\n`;
    });
    prompt += "Test input:\n";
    prompt += JSON.stringify(taskJson.test[0].input) + "\n\n";
    prompt += "What is the expected output grid? Return ONLY a JSON array like [[0,1,2],[1,0,2],...].";
    return prompt;
}

async function askGPTForSolution() {
    const taskJson = { train: [], test: [] };
    $(".pair_preview").each(function (index, element) {
        const inputGrid = convertJqGridToArray($(element).find('.input_preview'));
        const outputGrid = convertJqGridToArray($(element).find('.output_preview'));
        taskJson.train.push({ input: inputGrid, output: outputGrid });
    });
    if (TEST_PAIRS.length > 0) {
        taskJson.test.push({ input: CURRENT_INPUT_GRID.grid, output: TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'] });
    } else {
        alert("No test loaded!");
        return;
    }
    const prompt = formatPrompt(taskJson);
    console.log("Prompt sent to GPT:", prompt);
    document.getElementById("info_display").innerText = "Asking GPT-4o... please wait...";
    try {
        const output = await callGPT(prompt);
        const parsedOutput = JSON.parse(output);
        console.log("GPT-4o Output:", parsedOutput);
        const result = {
            task_name: document.getElementById("task_name").innerText,
            gpt_output: parsedOutput,
            ground_truth: taskJson.test[0].output,
            is_correct: compareGrids(parsedOutput, taskJson.test[0].output)
        };
        downloadJSON(result, "gpt4o_solution.json");
        CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(parsedOutput);
        syncFromDataGridToEditionGrid();
        $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
        document.getElementById("info_display").innerText = "✅ GPT-4o solution received and saved.";
    } catch (err) {
        document.getElementById("info_display").innerText = "Error during GPT call: " + err;
        console.error(err);
    }
}



function floodfillFromLocation(grid, i, j, symbol) {
    i = parseInt(i);
    j = parseInt(j);
    symbol = parseInt(symbol);
    let target = grid[i][j];
    if (target == symbol) {
        return;
    }
    function flow(i, j, symbol, target) {
        if (i >= 0 && i < grid.length && j >= 0 && j < grid[i].length) {
            if (grid[i][j] == target) {
                grid[i][j] = symbol;
                flow(i - 1, j, symbol, target);
                flow(i + 1, j, symbol, target);
                flow(i, j - 1, symbol, target);
                flow(i, j + 1, symbol, target);
            }
        }
    }
    flow(i, j, symbol, target);
}

function parseSizeTuple(size) {
    size = size.split('x');
    if (size.length != 2) {
        alert('Grid size should have the format "3x3", "5x7", etc.');
        return;
    }
    if ((size[0] < 1) || (size[1] < 1)) {
        alert('Grid size should be at least 1. Cannot have a grid with no cells.');
        return;
    }
    if ((size[0] > 30) || (size[1] > 30)) {
        alert('Grid size should be at most 30 per side. Pick a smaller size.');
        return;
    }
    return size;
}

function convertSerializedGridToGridObject(values) {
    let height = values.length;
    let width = values[0].length;
    return new Grid(height, width, values);
}

function fitCellsToContainer(jqGrid, height, width, containerHeight, containerWidth) {
    let candidate_height = Math.floor((containerHeight - height) / height);
    let candidate_width = Math.floor((containerWidth - width) / width);
    let size = Math.min(candidate_height, candidate_width);
    size = Math.min(MAX_CELL_SIZE, size);
    jqGrid.find('.cell').css('height', size + 'px');
    jqGrid.find('.cell').css('width', size + 'px');
}

function fillJqGridWithData(jqGrid, dataGrid) {
    jqGrid.empty();
    let height = dataGrid.height;
    let width = dataGrid.width;
    for (var i = 0; i < height; i++){
        let row = $(document.createElement('div'));
        row.addClass('row');
        for (var j = 0; j < width; j++){
            let cell = $(document.createElement('div'));
            cell.addClass('cell');
            cell.attr('x', i);
            cell.attr('y', j);
            setCellSymbol(cell, dataGrid.grid[i][j]);
            row.append(cell);
        }
        jqGrid.append(row);
    }
}

function copyJqGridToDataGrid(jqGrid, dataGrid) {
    let row_count = jqGrid.find('.row').length;
    if (dataGrid.height != row_count) {
        return;
    }
    let col_count = jqGrid.find('.cell').length / row_count;
    if (dataGrid.width != col_count) {
        return;
    }
    jqGrid.find('.row').each(function(i, row) {
        $(row).find('.cell').each(function(j, cell) {
            dataGrid.grid[i][j] = parseInt($(cell).attr('symbol'));
        });
    });
}

function setCellSymbol(cell, symbol) {
    cell.attr('symbol', symbol);
    let classesToRemove = '';
    for (let i = 0; i < 10; i++) {
        classesToRemove += 'symbol_' + i + ' ';
    }
    cell.removeClass(classesToRemove);
    cell.addClass('symbol_' + symbol);
    if ($('#show_symbol_numbers').is(':checked')) {
        cell.text(symbol);
    } else {
        cell.text('');
    }
}

function changeSymbolVisibility() {
    $('.cell').each(function(i, cell) {
        if ($('#show_symbol_numbers').is(':checked')) {
            $(cell).text($(cell).attr('symbol'));
        } else {
            $(cell).text('');
        }
    });
}

function errorMsg(msg) {
    $('#error_display').stop(true, true);
    $('#info_display').stop(true, true);
    $('#error_display').hide();
    $('#info_display').hide();
    $('#error_display').html(msg);
    $('#error_display').show();
    $('#error_display').fadeOut(5000);
}

function infoMsg(msg) {
    $('#error_display').stop(true, true);
    $('#info_display').stop(true, true);
    $('#info_display').hide();
    $('#error_display').hide();
    $('#info_display').html(msg);
    $('#info_display').show();
    $('#info_display').fadeOut(5000);
}

function convertJqGridToArray(jqGrid) {
    let array = [];
    jqGrid.find('.row').each(function(i, row) {
        let rowData = [];
        $(row).find('.cell').each(function(j, cell) {
            rowData.push(parseInt($(cell).attr('symbol')));
        });
        array.push(rowData);
    });
    return array;
}

function compareGrids(grid1, grid2) {
    if (grid1.length !== grid2.length) return false;
    for (let i = 0; i < grid1.length; i++) {
        if (grid1[i].length !== grid2[i].length) return false;
        for (let j = 0; j < grid1[i].length; j++) {
            if (grid1[i][j] !== grid2[i][j]) return false;
        }
    }
    return true;
}
