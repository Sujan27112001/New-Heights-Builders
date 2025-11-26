// State Management
const state = {
    projects: JSON.parse(localStorage.getItem('cm_projects')) || [],
    expenses: JSON.parse(localStorage.getItem('cm_expenses')) || [],
    tasks: JSON.parse(localStorage.getItem('cm_tasks')) || []
};

// DOM Elements
const views = {
    dashboard: document.getElementById('dashboard-view'),
    projects: document.getElementById('projects-view'),
    expenses: document.getElementById('expenses-view')
};

const navLinks = document.querySelectorAll('.nav-link');
const pageTitle = document.getElementById('page-title');
const newProjectBtn = document.getElementById('new-project-btn');
const projectModal = document.getElementById('project-modal');
const projectForm = document.getElementById('project-form');
const closeButtons = document.querySelectorAll('.close-modal');

// Backup & Restore Elements
const backupBtn = document.getElementById('backup-btn');
const restoreBtnTrigger = document.getElementById('restore-btn-trigger');
const restoreFileInput = document.getElementById('restore-file-input');

// Task Elements
const taskModal = document.getElementById('task-modal');
const taskList = document.getElementById('task-list');
const newTaskInput = document.getElementById('new-task-input');
const addTaskBtn = document.getElementById('add-task-btn');
let currentTaskId = null;

// Backup Logic
if (backupBtn) {
    backupBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(state, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `construction_manager_backup_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });
}

// Restore Logic
if (restoreBtnTrigger) {
    restoreBtnTrigger.addEventListener('click', () => {
        restoreFileInput.click();
    });
}

if (restoreFileInput) {
    restoreFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);

                // Basic validation
                if (!importedData.projects || !importedData.expenses) {
                    throw new Error('Invalid backup file format');
                }

                if (confirm('This will overwrite your current data. Are you sure?')) {
                    state.projects = importedData.projects;
                    state.expenses = importedData.expenses;
                    state.tasks = importedData.tasks || [];
                    saveData();
                    location.reload(); // Reload to refresh all views
                }
            } catch (error) {
                alert('Error restoring data: ' + error.message);
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again if needed
        restoreFileInput.value = '';
    });
}

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const viewName = link.dataset.view;

        // Update Active Link
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Update View
        Object.values(views).forEach(view => view.classList.remove('active', 'hidden'));
        Object.values(views).forEach(view => {
            if (view.id !== `${viewName}-view`) view.classList.add('hidden');
        });
        views[viewName].classList.add('active');

        // Update Title
        pageTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);

        // Refresh Data
        if (viewName === 'dashboard') renderDashboard();
        if (viewName === 'projects') renderProjects();
        if (viewName === 'expenses') renderExpenses();
    });
});

// Modal Handling
const toggleModal = (modal, show = true) => {
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
};

if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => toggleModal(projectModal, true));
}

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) {
            toggleModal(modal, false);
        }
    });
});

if (projectModal) {
    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) toggleModal(projectModal, false);
    });
}

// Project Management
if (projectForm) {
    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(projectForm);

        const newProject = {
            id: Date.now().toString(),
            name: formData.get('name'),
            client: formData.get('client'),
            budget: parseFloat(formData.get('budget')),
            status: formData.get('status'),
            createdAt: new Date().toISOString()
        };

        state.projects.push(newProject);
        saveData();
        toggleModal(projectModal, false);
        projectForm.reset();
        renderDashboard();

        // If on projects view, render projects
        if (views.projects.classList.contains('active')) {
            renderProjects();
        }
    });
}

// Expense Modal Handling
const expenseModal = document.getElementById('expense-modal');
const expenseForm = document.getElementById('expense-form');
const addExpenseBtn = document.getElementById('add-expense-btn');

if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', () => {
        updateProjectSelect();
        toggleModal(expenseModal, true);
    });
}

if (expenseModal) {
    expenseModal.addEventListener('click', (e) => {
        if (e.target === expenseModal) toggleModal(expenseModal, false);
    });
}

// Expense Management
if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(expenseForm);

        const newExpense = {
            id: Date.now().toString(),
            projectId: formData.get('projectId'),
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            createdAt: new Date().toISOString()
        };

        state.expenses.push(newExpense);
        saveData();
        toggleModal(expenseModal, false);
        expenseForm.reset();
        renderExpenses();
    });
}

// Task Management
if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
        const text = newTaskInput.value.trim();
        if (!text || !currentTaskId) return;

        const newTask = {
            id: Date.now().toString(),
            projectId: currentTaskId,
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        state.tasks.push(newTask);
        saveData();
        newTaskInput.value = '';
        renderTasks(currentTaskId);
    });
}

function openTaskModal(projectId) {
    currentTaskId = projectId;
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
        document.getElementById('task-modal-title').textContent = `Tasks: ${project.name}`;
        renderTasks(projectId);
        toggleModal(taskModal, true);
    }
}

function renderTasks(projectId) {
    taskList.innerHTML = '';
    const projectTasks = state.tasks.filter(t => t.projectId === projectId);

    if (projectTasks.length === 0) {
        taskList.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 1rem;">No tasks yet.</p>';
        return;
    }

    projectTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item ${task.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text">${task.text}</span>
            <button class="delete-task-btn"><i class="fa-solid fa-trash"></i></button>
        `;

        // Toggle Complete
        const checkbox = item.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
            task.completed = checkbox.checked;
            saveData();
            renderTasks(projectId);
        });

        // Delete Task
        const deleteBtn = item.querySelector('.delete-task-btn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Delete this task?')) {
                state.tasks = state.tasks.filter(t => t.id !== task.id);
                saveData();
                renderTasks(projectId);
            }
        });

        taskList.appendChild(item);
    });
}

if (taskModal) {
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) toggleModal(taskModal, false);
    });
}

function updateProjectSelect() {
    const select = document.getElementById('expense-project-select');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Select Project</option>';
    state.projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        select.appendChild(option);
    });
}

// Data Persistence
function saveData() {
    localStorage.setItem('cm_projects', JSON.stringify(state.projects));
    localStorage.setItem('cm_expenses', JSON.stringify(state.expenses));
    localStorage.setItem('cm_tasks', JSON.stringify(state.tasks));
}

// Rendering
function renderDashboard() {
    const activeProjects = state.projects.filter(p => p.status === 'In Progress').length;
    const totalRevenue = state.projects.reduce((acc, curr) => acc + (curr.budget || 0), 0);

    const activeProjectsEl = document.getElementById('total-active-projects');
    const totalRevenueEl = document.getElementById('total-revenue');
    const upcomingDeadlinesEl = document.getElementById('upcoming-deadlines');

    if (activeProjectsEl) activeProjectsEl.textContent = activeProjects;
    if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue.toLocaleString()}`;
    if (upcomingDeadlinesEl) upcomingDeadlinesEl.textContent = '0'; // Placeholder
}

function renderProjects() {
    const container = document.getElementById('projects-list');
    if (!container) return;

    container.innerHTML = '';

    if (state.projects.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No projects found. Create one to get started!</p></div>';
        return;
    }

    state.projects.forEach(project => {
        let progress = 0;
        if (project.status === 'Planning') progress = 33;
        if (project.status === 'In Progress') progress = 66;
        if (project.status === 'Completed') progress = 100;

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>${project.name}</h3>
                <span class="status-badge ${project.status.toLowerCase().replace(' ', '-')}">${project.status}</span>
            </div>
            <div class="card-body">
                <p><strong>Client:</strong> ${project.client}</p>
                <p><strong>Budget:</strong> $${project.budget.toLocaleString()}</p>
                <div class="project-timeline">
                    <div class="timeline-bar">
                        <div class="timeline-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="timeline-label">${progress}% Complete</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn-icon task-btn" data-id="${project.id}" title="Manage Tasks">
                    <i class="fa-solid fa-list-check"></i>
                </button>
                <button class="btn-icon invoice-btn" data-id="${project.id}" title="Generate Invoice">
                    <i class="fa-solid fa-file-invoice-dollar"></i>
                </button>
                <button class="btn-icon delete-btn" data-id="${project.id}" title="Delete Project">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm('Are you sure you want to delete this project?')) {
                state.projects = state.projects.filter(p => p.id !== id);
                saveData();
                renderProjects();
                renderDashboard();
            }
        });
    });

    // Add event listeners for task buttons
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Use closest to handle clicks on the icon
            const btnEl = e.target.closest('.task-btn');
            if (btnEl) {
                const id = btnEl.dataset.id;
                openTaskModal(id);
            }
        });
    });

    // Add event listeners for invoice buttons
    document.querySelectorAll('.invoice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.invoice-btn');
            if (btnEl) {
                const id = btnEl.dataset.id;
                generateInvoice(id);
            }
        });
    });
}

function generateInvoice(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;

    const invoiceWindow = window.open('', '_blank');
    const date = new Date().toLocaleDateString();

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${project.name}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
                .invoice-title { font-size: 32px; font-weight: bold; text-align: right; color: #1e293b; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                .client-details h3, .project-details h3 { font-size: 14px; text-transform: uppercase; color: #64748b; margin-bottom: 10px; }
                .info-row { margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { text-align: left; padding: 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                td { padding: 15px; border-bottom: 1px solid #e2e8f0; }
                .total-section { text-align: right; font-size: 20px; font-weight: bold; }
                .footer { margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <div class="company-name">
                    New Heights Builders
                </div>
                <div>
                    <div class="invoice-title">INVOICE</div>
                    <div style="text-align: right; color: #64748b;">Date: ${date}</div>
                </div>
            </div>

            <div class="details-grid">
                <div class="client-details">
                    <h3>Bill To</h3>
                    <div class="info-row"><strong>${project.client}</strong></div>
                </div>
                <div class="project-details">
                    <h3>Project Details</h3>
                    <div class="info-row"><strong>Project:</strong> ${project.name}</div>
                    <div class="info-row"><strong>Status:</strong> ${project.status}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Construction Services - ${project.name}</td>
                        <td style="text-align: right;">$${project.budget.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div class="total-section">
                Total Due: $${project.budget.toLocaleString()}
            </div>

            <div class="footer">
                <p>Thank you for your business!</p>
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
}

function renderExpenses() {
    const list = document.getElementById('expenses-list');
    if (!list) return;

    list.innerHTML = '';

    const totalExpenses = state.expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalBudget = state.projects.reduce((acc, curr) => acc + (curr.budget || 0), 0);

    const totalExpensesEl = document.getElementById('total-expenses-amount');
    const budgetProgressEl = document.getElementById('budget-progress');
    const budgetPercentageEl = document.getElementById('budget-percentage');

    if (totalExpensesEl) totalExpensesEl.textContent = `$${totalExpenses.toLocaleString()}`;

    const percentage = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
    if (budgetProgressEl) budgetProgressEl.style.width = `${Math.min(percentage, 100)}%`;
    if (budgetPercentageEl) budgetPercentageEl.textContent = `${percentage.toFixed(1)}% of Total Budget`;

    if (state.expenses.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="text-center">No expenses logged yet.</td></tr>';
        return;
    }

    state.expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(expense => {
        const project = state.projects.find(p => p.id === expense.projectId);
        const projectName = project ? project.name : 'Unknown Project';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td>${projectName}</td>
            <td>${expense.description}</td>
            <td>$${expense.amount.toLocaleString()}</td>
            <td>
                <button class="btn-icon delete-expense-btn" data-id="${expense.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
    });

    document.querySelectorAll('.delete-expense-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm('Delete this expense?')) {
                state.expenses = state.expenses.filter(e => e.id !== id);
                saveData();
                renderExpenses();
            }
        });
    });
}

// Initial Render
renderDashboard();
