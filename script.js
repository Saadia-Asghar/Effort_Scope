// Effort Scope - Team Contribution Tracker
class EffortScope {
    constructor() {
        this.contributions = [];
        this.currentUser = null;
        this.currentGroup = null;
        this.isAuthenticated = false;
        this.currentSortColumn = 'date';
        this.currentSortDirection = 'desc';
        this.editingId = null;
        this.charts = {};
        this.registeredUsers = {};
        this.datetimeInterval = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.checkAuth();
        this.updateCurrentDate();
        this.startLiveDateTime();
        setupPasswordToggles();
        setupPasswordStrengthPrompt(); // Renamed and adjusted for registration form
        setupSearchButton(this);
    }

    loadData() {
        const stored = localStorage.getItem('effortScopeData');
        if (stored) {
            try {
                this.contributions = JSON.parse(stored);
            } catch (e) {
                this.contributions = [];
                console.error("Error parsing contributions from localStorage:", e);
            }
        }

        const storedUsers = localStorage.getItem('effortScopeUsers');
        if (storedUsers) {
            try {
                this.registeredUsers = JSON.parse(storedUsers);
            } catch (e) {
                this.registeredUsers = {};
                console.error("Error parsing registered users from localStorage:", e);
            }
        }
    }

    saveData() {
        localStorage.setItem('effortScopeData', JSON.stringify(this.contributions));
        localStorage.setItem('effortScopeUsers', JSON.stringify(this.registeredUsers));
    }

    checkAuth() {
        const storedUser = localStorage.getItem('effortScopeUser');
        const storedGroup = localStorage.getItem('effortScopeGroup');
        if (storedUser && storedGroup) {
            this.currentUser = storedUser;
            this.currentGroup = storedGroup;
            this.isAuthenticated = true;
            this.showApp();
        } else {
            this.showAuth();
        }
    }

    authenticate(username, password) {
        if (this.registeredUsers[username] && this.registeredUsers[username].password === password) {
            this.currentGroup = username;
            this.isAuthenticated = true;
            localStorage.setItem('effortScopeGroup', username);
            this.showApp();
            return true;
        }
        return false;
    }

    registerUser(username, password) {
        if (this.registeredUsers[username]) {
            return { success: false, message: 'Username already exists' };
        }
        
        this.registeredUsers[username] = {
            password: password,
            createdAt: new Date().toISOString(),
            members: [] // Initialize members array for the group
        };
        
        this.saveData();
        return { success: true, message: 'Registration successful' };
    }

    logout() {
        // Use a custom modal for confirmation instead of `confirm()`
        this.showConfirmationModal('Are you sure you want to log out?', () => {
            this.currentUser = null;
            this.currentGroup = null;
            this.isAuthenticated = false;
            localStorage.removeItem('effortScopeUser');
            localStorage.removeItem('effortScopeGroup');
            // Clear contributions and registered users from memory, but not localStorage
            this.contributions = []; 
            this.registeredUsers = {};
            this.showAuth();
            this.showStatus('Logged out successfully!', 'success');
            // Reload the page to ensure all state is reset and auth screen is clean
            window.location.reload(); 
        });
    }

    showAuth() {
        // Ensure appContainer is hidden when showing auth screen
        const appContainer = document.getElementById('appContainer');
        if (appContainer) {
            appContainer.classList.add('hidden');
        }

        const authScreen = document.getElementById('authScreen');
        if (authScreen) { // Check if authScreen exists before manipulating
            authScreen.classList.remove('hidden');
        }
        this.stopLiveDateTime();
    }

    showApp() {
        const userSelection = document.getElementById('userSelection');
        if (!this.currentUser) {
            if (userSelection) { // Check if userSelection exists
                userSelection.classList.remove('hidden');
            }
            const appContainer = document.getElementById('appContainer');
            if (appContainer) { // Check if appContainer exists
                appContainer.classList.add('hidden');
            }
            return;
        }
        
        // Ensure auth screen is completely hidden
        const authScreen = document.getElementById('authScreen');
        if (authScreen) { // Check if authScreen exists before removing
            authScreen.classList.add('hidden');
            // If authScreen is being removed, ensure it's actually removed from DOM
            // This prevents "Cannot read properties of null" if it's already removed
            if (authScreen.parentNode) {
                authScreen.parentNode.removeChild(authScreen);
            }
        }
        
        if (userSelection) { // Check if userSelection exists before removing
            userSelection.classList.add('hidden');
            // If userSelection is being removed, ensure it's actually removed from DOM
            if (userSelection.parentNode) {
                userSelection.parentNode.removeChild(userSelection);
            }
        }
        
        // Show only the dashboard/app interface
        const appContainer = document.getElementById('appContainer');
        if (appContainer) { // Check if appContainer exists
            appContainer.classList.remove('hidden');
            appContainer.style.opacity = 1;
        }
        
        // Update URL for SPA feel
        if (window.history && window.history.pushState) {
            window.history.pushState({}, '', '/dashboard');
        }
        
        this.updateStats();
        this.updateMemberFilter();
        this.renderContributions();
        this.updateCharts();
        this.startLiveDateTime();
        const user = localStorage.getItem('effortScopeUser') || this.currentUser;
        if (user) document.getElementById('currentUser').textContent = `Welcome, ${user}!`;
        document.getElementById('contributionMember').textContent = this.currentUser;

        // Re-attach all event listeners after DOM changes
        // This is crucial because authScreen and userSelection are removed,
        // which might affect other listeners if not handled properly.
        // However, the main app listeners are on elements within appContainer,
        // which is now visible.
        setTimeout(() => {
            reattachAppEventListeners();
        }, 100);
    }

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    }

    startLiveDateTime() {
        this.updateDateTime();
        this.datetimeInterval = setInterval(() => {
            this.updateDateTime();
        }, 1000);
    }

    stopLiveDateTime() {
        if (this.datetimeInterval) {
            clearInterval(this.datetimeInterval);
            this.datetimeInterval = null;
        }
    }

    updateDateTime() {
        const now = new Date();
        const tz = localStorage.getItem('effortScopeTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const dateTimeString = now.toLocaleString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: tz
        });
        document.getElementById('liveDateTime').textContent = dateTimeString + ' (' + tz + ')';
    }

    setupEventListeners() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthForms('register');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthForms('login');
        });

        document.getElementById('continueBtn').addEventListener('click', () => {
            this.handleUserSelection();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            this.toggleDarkMode(e.target.checked);
        });

        document.getElementById('contributionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddContribution();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Search input is not present in index.html, so this listener might be for future use or removed.
        // document.getElementById('searchInput').addEventListener('input', () => {
        //     this.renderContributions();
        // });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.renderContributions();
        });

        document.getElementById('memberFilter').addEventListener('change', () => {
            this.renderContributions();
        });

        document.getElementById('startDate').addEventListener('change', () => {
            this.renderContributions();
        });

        document.getElementById('endDate').addEventListener('change', () => {
            this.renderContributions();
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        document.getElementById('exportJSON').addEventListener('click', () => {
            this.exportData('json');
        });

        document.getElementById('exportCSV').addEventListener('click', () => {
            this.exportData('csv');
        });

        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportPDF();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        document.getElementById('generateTestData').addEventListener('click', () => {
            this.generateTestData();
        });

        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });

        document.getElementById('chartPeriod').addEventListener('change', () => {
            this.updateCharts();
        });

        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.sort;
                this.sortContributions(column);
            });
        });

        // Search button logic (already present, just ensuring it's here)
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.renderContributions();
            });
        }
    }

    toggleAuthForms(form) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const userSelection = document.getElementById('userSelection');

        if (form === 'register') {
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
            if (userSelection) userSelection.classList.add('hidden');
            const loginPrompt = document.getElementById('loginPrompt');
            if (loginPrompt) loginPrompt.classList.add('hidden'); // Hide login prompt
        } else {
            if (registerForm) registerForm.classList.add('hidden');
            if (loginForm) loginForm.classList.remove('hidden');
            if (userSelection) userSelection.classList.add('hidden');
            const regError = document.getElementById('regError');
            if (regError) regError.classList.add('hidden'); // Hide registration error
            const registerPrompt = document.getElementById('registerPrompt');
            if (registerPrompt) registerPrompt.classList.add('hidden'); // Hide registration prompt
        }
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('authError');
        const promptDiv = document.getElementById('loginPrompt');
        if (!this.registeredUsers[username]) {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
            promptDiv.textContent = 'No account found. Please register.';
            promptDiv.classList.remove('hidden');
            return;
        }
        promptDiv.classList.add('hidden');
        if (this.authenticate(username, password)) {
            errorDiv.classList.add('hidden');
            this.populateUserSelection();
            document.getElementById('userSelection').classList.remove('hidden');
        } else {
            errorDiv.textContent = 'Invalid username or password';
            errorDiv.classList.remove('hidden');
        }
    }

    handleRegister() {
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('regError');
        const promptDiv = document.getElementById('registerPrompt');
        if (this.registeredUsers[username]) {
            errorDiv.textContent = 'Username already used.';
            errorDiv.classList.remove('hidden');
            promptDiv.classList.add('hidden');
            return;
        }
        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters.';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }

        const result = this.registerUser(username, password);
        if (result.success) {
            errorDiv.classList.add('hidden');
            this.showStatus(result.message, 'success');
            this.toggleAuthForms('login');
            document.getElementById('username').value = username;
            document.getElementById('password').value = password;
            promptDiv.textContent = 'Successfully registered! Please login.';
            promptDiv.classList.remove('hidden');
        } else {
            errorDiv.textContent = result.message;
            errorDiv.classList.remove('hidden');
        }
    }

    handleUserSelection() {
        const memberSelect = document.getElementById('memberSelect');
        const newMember = document.getElementById('newMember').value.trim();
        const memberError = document.getElementById('memberError');
        
        // Validate input
        if (!memberSelect.value && !newMember) {
            memberError.textContent = 'Please select or add a member name.';
            memberError.classList.remove('hidden');
            return;
        }
        
        memberError.classList.add('hidden');
        
        const selectedMember = memberSelect.value || newMember;
        this.currentUser = selectedMember;
        localStorage.setItem('effortScopeUser', selectedMember);
        
        const currentUserEl = document.getElementById('currentUser');
        const contributionMemberEl = document.getElementById('contributionMember');
        
        if (currentUserEl) currentUserEl.textContent = `Welcome, ${selectedMember}!`;
        if (contributionMemberEl) contributionMemberEl.textContent = selectedMember;
        
        // Store member in group member list if not already present
        if (this.currentGroup && this.registeredUsers[this.currentGroup]) {
            if (!Array.isArray(this.registeredUsers[this.currentGroup].members)) {
                this.registeredUsers[this.currentGroup].members = [];
            }
            if (!this.registeredUsers[this.currentGroup].members.includes(selectedMember)) {
                this.registeredUsers[this.currentGroup].members.push(selectedMember);
                this.saveData();
            }
        }
        
        // Remove member selection and auth UI from DOM
        const authScreen = document.getElementById('authScreen');
        if (authScreen) authScreen.remove(); // Use .remove() directly if element exists
        const userSelection = document.getElementById('userSelection');
        if (userSelection) userSelection.remove(); // Use .remove() directly if element exists
        
        // Show only the dashboard/app interface
        const appContainer = document.getElementById('appContainer');
        if (appContainer) {
            appContainer.classList.remove('hidden');
            appContainer.style.opacity = 1;
        }
        
        // Update URL for SPA feel
        if (window.history && window.history.pushState) {
            window.history.pushState({}, '', '/dashboard');
        }
        
        this.showApp();
        
        // Re-attach all event listeners after DOM changes
        setTimeout(() => {
            reattachAppEventListeners();
        }, 100);
    }

    populateUserSelection() {
        const memberSelect = document.getElementById('memberSelect');
        const group = this.currentGroup;
        // Get all members who have contributed under the group
        const contributedMembers = new Set(this.contributions.filter(c => c.group === group).map(c => c.member));
        // Get all members who have ever logged in/selected for this group
        let groupMembers = [];
        if (this.currentGroup && this.registeredUsers[this.currentGroup] && Array.isArray(this.registeredUsers[this.currentGroup].members)) {
            registeredMembers = this.registeredUsers[this.currentGroup].members;
        }
        // Merge both sets
        const allMembers = Array.from(new Set([...groupMembers, ...contributedMembers]));
        memberSelect.innerHTML = '<option value="">Select existing member...</option>';
        allMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            memberSelect.appendChild(option);
        });
    }

    handleAddContribution() {
        this.currentUser = localStorage.getItem('effortScopeUser') || this.currentUser;
        document.getElementById('contributionMember').textContent = this.currentUser;
        const task = document.getElementById('task').value;
        const category = document.getElementById('category').value;
        const hours = parseFloat(document.getElementById('hours').value);
        const date = document.getElementById('date').value;
        if (!task || !category || !hours || !date) {
            this.showStatus('Please fill in all fields', 'error');
            return;
        }
        if (this.editingId) {
            const index = this.contributions.findIndex(c => c.id === this.editingId);
            if (index !== -1) {
                this.contributions[index] = {
                    ...this.contributions[index],
                    task,
                    category,
                    hours,
                    date
                };
            }
            this.editingId = null;
            document.getElementById('cancelEdit').classList.add('hidden');
        } else {
            const contribution = {
                id: Date.now(),
                member: this.currentUser,
                group: this.currentGroup,
                task,
                category,
                hours,
                date,
                createdAt: new Date().toISOString()
            };
            this.contributions.push(contribution);
        }
        this.saveData();
        this.resetForm();
        this.updateStats();
        this.renderContributions();
        this.updateCharts();
        this.showStatus('Contribution saved successfully', 'success');
    }

    editContribution(id) {
        const contribution = this.contributions.find(c => c.id === id);
        if (contribution && contribution.member === this.currentUser) {
            this.editingId = id;
            document.getElementById('task').value = contribution.task;
            document.getElementById('category').value = contribution.category;
            document.getElementById('hours').value = contribution.hours;
            document.getElementById('date').value = contribution.date;
            document.getElementById('cancelEdit').classList.remove('hidden');
            this.showSection('add');
        } else {
            this.showStatus('You can only edit your own contributions', 'error');
        }
    }

    deleteContribution(id) {
        const contribution = this.contributions.find(c => c.id === id);
        if (contribution && contribution.member !== this.currentUser) {
            this.showStatus('You can only delete your own contributions', 'error');
            return;
        }

        this.showConfirmationModal('Are you sure you want to delete this contribution?', () => {
            this.contributions = this.contributions.filter(c => c.id !== id);
            this.saveData();
            this.updateStats();
            this.renderContributions();
            this.updateCharts();
            this.showStatus('Contribution deleted', 'success');
        });
    }

    cancelEdit() {
        this.editingId = null;
        this.resetForm();
        document.getElementById('cancelEdit').classList.add('hidden');
    }

    resetForm() {
        document.getElementById('contributionForm').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }

    renderContributions() {
        const tableBody = document.getElementById('contributionsTable');
        const emptyState = document.getElementById('emptyState');
        let filteredContributions = this.getFilteredContributions();
        filteredContributions = this.sortContributionsData(filteredContributions);
        if (filteredContributions.length === 0) {
            tableBody.innerHTML = '';
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').textContent = 'No contributions yet. Add your first contribution!';
            this.updateCharts();
            return;
        }
        emptyState.classList.add('hidden');
        tableBody.innerHTML = filteredContributions.map(contribution => {
            const canEdit = contribution.member === this.currentUser;
            return `
                <tr>
                    <td>${contribution.member}</td>
                    <td>${contribution.task}</td>
                    <td><span class="category-tag">${contribution.category}</span></td>
                    <td>${contribution.hours}</td>
                    <td>${this.formatDate(contribution.date)}</td>
                    <td>
                        ${canEdit ? `
                            <button class="btn btn-outline btn-sm" onclick="app.editContribution(${contribution.id})">
                                <span class="material-icons-round">edit</span>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="app.deleteContribution(${contribution.id})">
                                <span class="material-icons-round">delete</span>
                            </button>
                        ` : '<span class="text-muted">View only</span>'}
                    </td>
                </tr>
            `;
        }).join('');
        this.updateCharts();
    }

    getFilteredContributions() {
        let filtered = [...this.contributions];
        // Only show data for current group
        filtered = filtered.filter(c => c.group === this.currentGroup);
        // Category filter
        const categoryFilter = document.getElementById('categoryFilter').value;
        if (categoryFilter) {
            filtered = filtered.filter(c => c.category === categoryFilter);
        }
        // Member filter
        const memberFilter = document.getElementById('memberFilter').value;
        if (memberFilter) {
            filtered = filtered.filter(c => c.member === memberFilter);
        }
        // Date range filter
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) {
            filtered = filtered.filter(c => c.date >= startDate);
        }
        if (endDate) {
            filtered = filtered.filter(c => c.date <= endDate);
        }
        return filtered;
    }

    sortContributionsData(contributions) {
        return contributions.sort((a, b) => {
            let aVal = a[this.currentSortColumn];
            let bVal = b[this.currentSortColumn];

            if (this.currentSortColumn === 'date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else if (this.currentSortColumn === 'hours') {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            } else {
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
            }

            if (this.currentSortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    sortContributions(column) {
        if (this.currentSortColumn === column) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortColumn = column;
            this.currentSortDirection = 'asc';
        }
        this.renderContributions();
    }

    updateStats() {
        const groupContributions = this.contributions.filter(c => c.group === this.currentGroup);
        const totalMembers = new Set(groupContributions.map(c => c.member)).size;
        const totalHours = groupContributions.reduce((sum, c) => sum + c.hours, 0);
        const totalContributions = groupContributions.length;
        const currentDate = new Date().toLocaleDateString();
        document.getElementById('totalMembers').textContent = totalMembers;
        document.getElementById('totalHours').textContent = totalHours.toFixed(1);
        document.getElementById('totalContributions').textContent = totalContributions;
        document.getElementById('currentDate').textContent = currentDate;
        this.updateMemberFilter();
    }

    updateMemberFilter() {
        const memberFilter = document.getElementById('memberFilter');
        if (!memberFilter) return;
        
        // Get members from contributions
        const contributionMembers = [...new Set(this.contributions.filter(c => c.group === this.currentGroup).map(c => c.member))];
        
        // Get members from registered users for this group
        let registeredMembers = [];
        if (this.currentGroup && this.registeredUsers[this.currentGroup] && Array.isArray(this.registeredUsers[this.currentGroup].members)) {
            registeredMembers = this.registeredUsers[this.currentGroup].members;
        }
        
        // Combine both sets of members
        const allMembers = [...new Set([...contributionMembers, ...registeredMembers])];
        
        memberFilter.innerHTML = '<option value="">All Members</option>';
        allMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            memberFilter.appendChild(option);
        });
    }

    updateCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    updateCharts() {
        const period = document.getElementById('chartPeriod').value;
        const filteredData = this.getChartData(period);
        // If no data, show empty state in charts
        if (filteredData.length === 0) {
            ['memberChart', 'categoryChart', 'weeklyChart'].forEach(id => {
                const ctx = document.getElementById(id);
                if (ctx) {
                    const parent = ctx.parentElement;
                    ctx.style.display = 'none';
                    let msg = parent.querySelector('.chart-empty');
                    if (!msg) {
                        msg = document.createElement('div');
                        msg.className = 'chart-empty';
                        msg.style = 'color: var(--text-muted); text-align:center; margin-top: 2.5rem; font-size: 1.1rem;';
                        msg.textContent = 'No data to display.';
                        parent.appendChild(msg);
                    }
                }
            });
            return;
        } else {
            ['memberChart', 'categoryChart', 'weeklyChart'].forEach(id => {
                const ctx = document.getElementById(id);
                if (ctx) {
                    ctx.style.display = '';
                    const parent = ctx.parentElement;
                    const msg = parent.querySelector('.chart-empty');
                    if (msg) parent.removeChild(msg);
                }
            });
        }
        this.updateMemberChart(filteredData);
        this.updateCategoryChart(filteredData);
        this.updateWeeklyChart(filteredData);
    }

    getChartData(period) {
        const now = new Date();
        let cutoffDate = new Date();

        switch (period) {
            case '7':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '30':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            case '90':
                cutoffDate.setDate(now.getDate() - 90);
                break;
            case 'all':
                cutoffDate = new Date(0);
                break;
        }

        // Filter contributions by the current group in addition to date
        return this.contributions.filter(c =>
            c.group === this.currentGroup && new Date(c.date) >= cutoffDate
        );
    }

    updateMemberChart(data) {
        const ctx = document.getElementById('memberChart');
        if (this.charts.member) {
            this.charts.member.destroy();
        }

        const memberData = {};
        data.forEach(c => {
            memberData[c.member] = (memberData[c.member] || 0) + c.hours;
        });

        this.charts.member = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(memberData),
                datasets: [{
                    data: Object.values(memberData),
                    backgroundColor: [
                        '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
                        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateCategoryChart(data) {
        const ctx = document.getElementById('categoryChart');
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const categoryData = {};
        data.forEach(c => {
            categoryData[c.category] = (categoryData[c.category] || 0) + c.hours;
        });

        this.charts.category = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    label: 'Hours',
                    data: Object.values(categoryData),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateWeeklyChart(data) {
        const ctx = document.getElementById('weeklyChart');
        if (this.charts.weekly) {
            this.charts.weekly.destroy();
        }
        const period = document.getElementById('chartPeriod').value;
        let labels = [], hours = [];
        let grouped = {};
        if (period === 'today') {
            // Group by hour
            for (let i = 0; i < 24; i++) grouped[i] = 0;
            data.forEach(c => {
                const hour = new Date(c.date).getHours();
                grouped[hour] = (grouped[hour] || 0) + c.hours;
            });
            labels = Object.keys(grouped).map(h => `${h}:00`);
            hours = Object.values(grouped);
        } else if (period === '7' || period === '30' || period === '90') {
            // Group by day
            data.forEach(c => {
                const day = c.date;
                grouped[day] = (grouped[day] || 0) + c.hours;
            });
            labels = Object.keys(grouped).sort();
            hours = labels.map(l => grouped[l]);
        } else if (period === 'monthly') {
            // Group by week of month
            data.forEach(c => {
                const d = new Date(c.date);
                const week = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
                const label = `Week ${week}`;
                grouped[label] = (grouped[label] || 0) + c.hours;
            });
            labels = Object.keys(grouped).sort();
            hours = labels.map(l => grouped[l]);
        } else if (period === 'all') {
            // Group by month
            data.forEach(c => {
                const d = new Date(c.date);
                const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                grouped[label] = (grouped[label] || 0) + c.hours;
            });
            labels = Object.keys(grouped).sort((a, b) => {
                // Sort by year then month
                const [ma, ya] = a.split(' ');
                const [mb, yb] = b.split(' ');
                return ya !== yb ? ya - yb : new Date(`${ma} 1, 2000`).getMonth() - new Date(`${mb} 1, 2000`).getMonth();
            });
            hours = labels.map(l => grouped[l]);
        }
        this.charts.weekly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Hours',
                    data: hours,
                    backgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    resetFilters() {
        document.getElementById('categoryFilter').value = '';
        document.getElementById('memberFilter').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        this.renderContributions();
        this.updateCharts();
    }

    exportData(format) {
        try {
            const data = this.contributions.filter(c => c.group === this.currentGroup); // Export only current group's data
            if (data.length === 0) {
                this.showStatus('No data to export!', 'error');
                return;
            }

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                this.downloadFile(blob, `effort-scope-data-${this.currentGroup}.json`);
                this.showStatus('Exported JSON successfully!', 'success');
                console.log('Exported JSON');
            } else if (format === 'csv') {
                const csv = this.convertToCSV(data);
                const blob = new Blob([csv], { type: 'text/csv' });
                this.downloadFile(blob, `effort-scope-data-${this.currentGroup}.csv`);
                this.showStatus('Exported CSV successfully!', 'success');
                console.log('Exported CSV');
            }
        } catch (e) {
            this.showStatus('Export error: ' + e.message, 'error');
            console.error('Export error:', e);
        }
    }

    exportPDF() {
        try {
            const data = this.contributions.filter(c => c.group === this.currentGroup);
            if (data.length === 0) {
                this.showStatus('No data to export to PDF!', 'error');
                return;
            }

            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 20px; font-family: Arial, sans-serif;">
                    <h1 style="color: #6366f1; text-align: center;">Effort Scope Report - ${this.currentGroup}</h1>
                    <p style="text-align: center; color: #666;">Generated on ${new Date().toLocaleString()}</p>
                    <h2>Summary Statistics</h2>
                    <ul>
                        <li>Total Members: ${new Set(data.map(c => c.member)).size}</li>
                        <li>Total Hours: ${data.reduce((sum, c) => sum + c.hours, 0).toFixed(1)}</li>
                        <li>Total Contributions: ${data.length}</li>
                    </ul>
                    <h2>Recent Contributions</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="border: 1px solid #ddd; padding: 8px;">Member</th>
                                <th style="border: 1px solid #ddd; padding: 8px;">Task</th>
                                <th style="border: 1px solid #ddd; padding: 8px;">Category</th>
                                <th style="border: 1px solid #ddd; padding: 8px;">Hours</th>
                                <th style="border: 1px solid #ddd; padding: 8px;">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.slice(-10).map(c => `
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 8px;">${c.member}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">${c.task}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">${c.category}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">${c.hours}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">${this.formatDate(c.date)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            const opt = {
                margin: 1,
                filename: `effort-scope-report-${this.currentGroup}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
            this.showStatus('Exported PDF successfully!', 'success');
            console.log('Exported PDF');
        } catch (e) {
            this.showStatus('Export PDF error: ' + e.message, 'error');
            console.error('Export PDF error:', e);
        }
    }

    convertToCSV(data) {
        const headers = ['Member', 'Task', 'Category', 'Hours', 'Date'];
        const rows = data.map(c => [c.member, c.task, c.category, c.hours, c.date]);
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(file) {
        if (!file) {
            this.showStatus('No file selected for import.', 'error');
            return;
        }
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data)) {
                        // Filter data to only include contributions for the current group,
                        // or add new contributions if their group matches the current group.
                        // This prevents importing data for other groups.
                        const newContributions = data.filter(c => c.group === this.currentGroup);
                        
                        // Merge or replace existing data. For simplicity, we'll append new unique data.
                        // A more robust solution might involve merging by ID or prompting the user.
                        const existingIds = new Set(this.contributions.map(c => c.id));
                        newContributions.forEach(newCont => {
                            if (!existingIds.has(newCont.id)) {
                                this.contributions.push(newCont);
                            }
                        });

                        this.saveData();
                        this.updateStats();
                        this.renderContributions();
                        this.updateCharts();
                        this.showStatus('Data imported successfully!', 'success');
                        console.log('Imported JSON');
                    } else {
                        throw new Error('Invalid data format: Expected an array.');
                    }
                } catch (error) {
                    this.showStatus('Error importing data: ' + error.message, 'error');
                    console.error('Import error:', error);
                }
            };
            reader.readAsText(file);
        } catch (e) {
            this.showStatus('Import error: ' + e.message, 'error');
            console.error('Import error:', e);
        }
    }

    generateTestData() {
        try {
            const group = this.currentGroup;
            const members = ['Ali Khan', 'Fatima Ahmed', 'Usman Tariq', 'Ayesha Siddiqui', 'Bilal Hassan'];
            if (!group) {
                this.showStatus('Please log in as a group before generating test data.', 'error');
                return;
            }
            if (!this.currentUser) {
                this.currentUser = members[0];
                localStorage.setItem('effortScopeUser', members[0]);
            }
            if (this.registeredUsers[group]) {
                if (!Array.isArray(this.registeredUsers[group].members)) {
                    this.registeredUsers[group].members = [];
                }
                members.forEach(m => {
                    if (!this.registeredUsers[group].members.includes(m)) {
                        this.registeredUsers[group].members.push(m);
                    }
                });
                this.saveData();
            }
            const testData = [
                { id: Date.now() + 1, member: members[0], group, task: 'Frontend Development - React Components', category: 'Development', hours: 8.5, date: this.getDateString(-14), createdAt: new Date().toISOString() },
                { id: Date.now() + 2, member: members[1], group, task: 'UI/UX Design - Dashboard Mockups', category: 'Design', hours: 6.0, date: this.getDateString(-14), createdAt: new Date().toISOString() },
                { id: Date.now() + 3, member: members[2], group, task: 'Backend API Development', category: 'Development', hours: 7.5, date: this.getDateString(-13), createdAt: new Date().toISOString() },
                { id: Date.now() + 4, member: members[3], group, task: 'Unit Testing - Frontend Components', category: 'Testing', hours: 4.0, date: this.getDateString(-13), createdAt: new Date().toISOString() },
                { id: Date.now() + 5, member: members[4], group, task: 'Database Schema Design', category: 'Development', hours: 5.5, date: this.getDateString(-12), createdAt: new Date().toISOString() },
                { id: Date.now() + 6, member: members[0], group, task: 'Code Review and Refactoring', category: 'Development', hours: 3.0, date: this.getDateString(-12), createdAt: new Date().toISOString() },
                { id: Date.now() + 7, member: members[1], group, task: 'User Research and Interviews', category: 'Research', hours: 4.5, date: this.getDateString(-11), createdAt: new Date().toISOString() },
                { id: Date.now() + 8, member: members[2], group, task: 'API Documentation', category: 'Documentation', hours: 2.5, date: this.getDateString(-11), createdAt: new Date().toISOString() },
                { id: Date.now() + 9, member: members[3], group, task: 'Integration Testing', category: 'Testing', hours: 6.0, date: this.getDateString(-10), createdAt: new Date().toISOString() },
                { id: Date.now() + 10, member: members[4], group, task: 'Performance Optimization', category: 'Development', hours: 8.0, date: this.getDateString(-10), createdAt: new Date().toISOString() },
                { id: Date.now() + 11, member: members[0], group, task: 'Bug Fixes and Maintenance', category: 'Development', hours: 4.0, date: this.getDateString(-7), createdAt: new Date().toISOString() },
                { id: Date.now() + 12, member: members[1], group, task: 'Design System Updates', category: 'Design', hours: 5.5, date: this.getDateString(-7), createdAt: new Date().toISOString() },
                { id: Date.now() + 13, member: members[2], group, task: 'Security Implementation', category: 'Development', hours: 7.0, date: this.getDateString(-6), createdAt: new Date().toISOString() },
                { id: Date.now() + 14, member: members[3], group, task: 'End-to-End Testing', category: 'Testing', hours: 5.0, date: this.getDateString(-6), createdAt: new Date().toISOString() },
                { id: Date.now() + 15, member: members[4], group, task: 'Deployment and CI/CD Setup', category: 'DevOps', hours: 6.5, date: this.getDateString(-5), createdAt: new Date().toISOString() },
                { id: Date.now() + 16, member: members[0], group, task: 'Feature Development - User Profiles', category: 'Development', hours: 8.0, date: this.getDateString(-3), createdAt: new Date().toISOString() },
                { id: Date.now() + 17, member: members[1], group, task: 'Mobile App Design', category: 'Design', hours: 6.5, date: this.getDateString(-3), createdAt: new Date().toISOString() },
                { id: Date.now() + 18, member: members[2], group, task: 'Microservices Architecture', category: 'Development', hours: 9.0, date: this.getDateString(-2), createdAt: new Date().toISOString() },
                { id: Date.now() + 19, member: members[3], group, task: 'Automated Testing Suite', category: 'Testing', hours: 4.5, date: this.getDateString(-2), createdAt: new Date().toISOString() },
                { id: Date.now() + 20, member: members[4], group, task: 'Cloud Infrastructure Setup', category: 'DevOps', hours: 7.5, date: this.getDateString(-1), createdAt: new Date().toISOString() },
                { id: Date.now() + 21, member: members[0], group, task: 'Code Review and Team Meeting', category: 'Development', hours: 3.5, date: this.getDateString(0), createdAt: new Date().toISOString() },
                { id: Date.now() + 22, member: members[1], group, task: 'Design Review and Feedback', category: 'Design', hours: 4.0, date: this.getDateString(0), createdAt: new Date().toISOString() },
                { id: Date.now() + 23, member: members[2], group, task: 'API Testing and Debugging', category: 'Development', hours: 6.0, date: this.getDateString(0), createdAt: new Date().toISOString() },
                { id: Date.now() + 24, member: members[3], group, task: 'Test Case Documentation', category: 'Documentation', hours: 2.5, date: this.getDateString(0), createdAt: new Date().toISOString() },
                { id: Date.now() + 25, member: members[4], group, task: 'Monitoring and Logging Setup', category: 'DevOps', hours: 5.0, date: this.getDateString(0), createdAt: new Date().toISOString() }
            ];
            this.contributions.push(...testData);
            this.saveData();
            this.showApp();
            this.showStatus('Comprehensive test data generated successfully! Explore charts, filters, and statistics.', 'success');
            console.log('Generated test data');
        } catch (e) {
            this.showStatus('Generate test data error: ' + e.message, 'error');
            console.error('Generate test data error:', e);
        }
    }

    // Helper method to get date string relative to today
    getDateString(daysOffset) {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        return date.toISOString().split('T')[0];
    }

    clearAllData() {
        this.showConfirmationModal('Are you sure you want to clear all data? This action cannot be undone.', () => {
            try {
                this.contributions = this.contributions.filter(c => c.group !== this.currentGroup); // Only clear current group's data
                this.saveData();
                this.updateStats();
                this.renderContributions();
                this.updateCharts();
                this.showStatus('All data for this group cleared!', 'success');
                console.log('Cleared all data for current group');
            } catch (e) {
                this.showStatus('Clear data error: ' + e.message, 'error');
                console.error('Clear data error:', e);
            }
        });
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    toggleDarkMode(enabled) {
        document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
        localStorage.setItem('effortScopeDarkMode', enabled);
    }

    showStatus(message, type = 'success') {
        const statusDiv = document.getElementById('dataStatus');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = 'status-message ' + type;
            statusDiv.classList.remove('hidden');
            setTimeout(() => { statusDiv.classList.add('hidden'); }, 3000);
        }
    }

    // Custom confirmation modal instead of `confirm()`
    showConfirmationModal(message, onConfirm) {
        // Create modal elements
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <p>${message}</p>
                <div class="modal-actions">
                    <button id="modalConfirmBtn" class="btn btn-danger">Confirm</button>
                    <button id="modalCancelBtn" class="btn btn-outline">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Get references to the buttons *after* they are in the DOM
        const confirmBtn = modal.querySelector('#modalConfirmBtn');
        const cancelBtn = modal.querySelector('#modalCancelBtn');

        // Add event listeners to the buttons
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                onConfirm();
                document.body.removeChild(modal);
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        }

        // Basic styling for the modal (can be moved to CSS)
        const style = document.createElement('style');
        style.innerHTML = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            .modal-content {
                background: var(--surface);
                padding: 2rem;
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-lg);
                text-align: center;
                max-width: 400px;
                width: 90%;
            }
            .modal-content p {
                margin-bottom: 1.5rem;
                font-size: 1.1rem;
                color: var(--text-primary);
            }
            .modal-actions {
                display: flex;
                justify-content: center;
                gap: 1rem;
            }
            [data-theme="dark"] .modal-content {
                background: var(--surface);
                color: var(--text-primary);
            }
        `;
        modal.appendChild(style);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app first
    app = new EffortScope();
    
    // Setup basic UI elements
    const darkMode = localStorage.getItem('effortScopeDarkMode') === 'true';
    document.getElementById('darkModeToggle').checked = darkMode;
    app.toggleDarkMode(darkMode);
    
    // Setup utility functions
    setupCountrySelect();
    animateTechBackground();
    setupPasswordToggles();
    setupPasswordStrengthPrompt(); // Call this here to ensure it's always set up for regPassword
    
    // Show initialization status
    const statusDiv = document.getElementById('dataStatus');
    if (statusDiv) {
        statusDiv.textContent = 'App initialized successfully';
        statusDiv.className = 'status-message success';
        statusDiv.classList.remove('hidden');
        setTimeout(() => { statusDiv.classList.add('hidden'); }, 2000);
    }
});

// Password strength utility
function getPasswordStrength(password) {
    let strength = 'weak';
    // At least 6 characters, contains letters and numbers
    const mediumRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    // At least 10 characters, contains letters, numbers, and special characters
    const strongRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{10,}$/;

    if (strongRegex.test(password)) {
        strength = 'strong';
    } else if (mediumRegex.test(password)) {
        strength = 'medium';
    } else if (password.length > 0) { // If there's input but doesn't meet medium criteria
        strength = 'weak';
    }
    return strength;
}

// Password show/hide toggle for all password fields
function setupPasswordToggles() {
    const toggles = [
        {input: 'password', toggle: 'togglePassword'},
        {input: 'regPassword', toggle: 'toggleRegPassword'},
        {input: 'confirmPassword', toggle: 'toggleConfirmPassword'}
    ];
    toggles.forEach(({input, toggle}) => {
        const inputEl = document.getElementById(input);
        const toggleEl = document.getElementById(toggle);
        if (inputEl && toggleEl) {
            // Remove any existing listeners to prevent duplicates
            const oldToggleListener = toggleEl._toggleListener;
            if (oldToggleListener) {
                toggleEl.removeEventListener('click', oldToggleListener);
            }

            const newToggleListener = () => {
                if (inputEl.type === 'password') {
                    inputEl.type = 'text';
                    toggleEl.textContent = 'visibility'; // Icon for visible password
                } else {
                    inputEl.type = 'password';
                    toggleEl.textContent = 'visibility_off'; // Icon for hidden password
                }
            };
            toggleEl.addEventListener('click', newToggleListener);
            toggleEl._toggleListener = newToggleListener; // Store reference
        }
    });
}

// Country to timezone mapping
const countryToTimezone = {
    US: 'America/New_York',
    GB: 'Europe/London',
    PK: 'Asia/Karachi',
    IN: 'Asia/Kolkata',
    DE: 'Europe/Berlin',
    FR: 'Europe/Paris',
    CN: 'Asia/Shanghai',
    JP: 'Asia/Tokyo',
    RU: 'Europe/Moscow',
    BR: 'America/Sao_Paulo',
    CA: 'America/Toronto',
    AU: 'Australia/Sydney',
    EG: 'Africa/Cairo',
    ZA: 'Africa/Johannesburg',
    TR: 'Europe/Istanbul',
    IT: 'Europe/Rome',
    ES: 'Europe/Madrid',
    MX: 'America/Mexico_City',
    KR: 'Asia/Seoul',
    ID: 'Asia/Jakarta',
    NG: 'Africa/Lagos',
    AR: 'America/Argentina/Buenos_Aires',
    SA: 'Asia/Riyadh',
    BD: 'Asia/Dhaka',
    PL: 'Europe/Warsaw',
    NL: 'Europe/Amsterdam',
    UA: 'Europe/Kiev',
    TH: 'Asia/Bangkok',
    IR: 'Asia/Tehran',
    PH: 'Asia/Manila'
};

function setupCountrySelect() {
    const select = document.getElementById('countrySelect');
    if (!select) return;
    select.addEventListener('change', () => {
        const tz = countryToTimezone[select.value] || Intl.DateTimeFormat().resolvedOptions().timeZone;
        localStorage.setItem('effortScopeTimezone', tz);
        app.updateDateTime();
    });
    // Set default to browser timezone
    const tz = localStorage.getItem('effortScopeTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    let found = false;
    for (const [code, zone] of Object.entries(countryToTimezone)) {
        if (zone === tz) {
            select.value = code;
            found = true;
            break;
        }
    }
    if (!found) select.value = '';
}

// Password strength prompt for registration form
function setupPasswordStrengthPrompt() {
    const regPass = document.getElementById('regPassword');
    const regStrength = document.getElementById('regPasswordStrength');
    if (regPass && regStrength) {
        // Remove any existing listeners to prevent duplicates
        const oldInputListener = regPass._inputListener;
        if (oldInputListener) {
            regPass.removeEventListener('input', oldInputListener);
        }

        const newInputListener = () => {
            const val = regPass.value;
            const strength = getPasswordStrength(val);
            regStrength.textContent = val ? (strength.charAt(0).toUpperCase() + strength.slice(1)) : '';
            regStrength.className = 'password-strength ' + strength;
        };
        regPass.addEventListener('input', newInputListener);
        regPass._inputListener = newInputListener; // Store reference

        // Initial check in case there's pre-filled value
        const initialVal = regPass.value;
        if (initialVal) {
            const strength = getPasswordStrength(initialVal);
            regStrength.textContent = strength.charAt(0).toUpperCase() + strength.slice(1);
            regStrength.className = 'password-strength ' + strength;
        } else {
            regStrength.textContent = ''; // Ensure it's empty if no initial value
            regStrength.className = 'password-strength';
        }
    }
}

// Dynamic tech background animation
function animateTechBackground() {
    const canvas = document.getElementById('techLines');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    });
    const lines = Array.from({length: 18}, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 80 + Math.random() * 120,
        speed: 0.3 + Math.random() * 0.7,
        angle: Math.random() * Math.PI * 2,
        color: `rgba(99,102,241,${0.12 + Math.random() * 0.18})`
    }));
    function draw() {
        ctx.clearRect(0,0,w,h);
        for (const l of lines) {
            ctx.save();
            ctx.translate(l.x, l.y);
            ctx.rotate(l.angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(l.len, 0);
            ctx.strokeStyle = l.color;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = l.color;
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.restore();
            l.x += Math.cos(l.angle) * l.speed;
            l.y += Math.sin(l.angle) * l.speed;
            if (l.x < -l.len) l.x = w + l.len;
            if (l.x > w + l.len) l.x = -l.len;
            if (l.y < -l.len) l.y = h + l.len;
            if (l.y > h + l.len) l.y = -l.len;
        }
        requestAnimationFrame(draw);
    }
    draw();
}

// Search button logic
function setupSearchButton(appInstance) { // Renamed parameter to avoid conflict with global 'app'
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        // Remove any existing listeners to prevent duplicates
        const oldSearchListener = searchBtn._searchListener;
        if (oldSearchListener) {
            searchBtn.removeEventListener('click', oldSearchListener);
        }

        const newSearchListener = () => {
            appInstance.renderContributions(); // Use the passed app instance
        };
        searchBtn.addEventListener('click', newSearchListener);
        searchBtn._searchListener = newSearchListener; // Store reference
    }
}

// Function to re-attach event listeners after DOM changes (e.g., after user selection)
function reattachAppEventListeners() {
    console.log('Re-attaching app event listeners...');
    
    // Re-attach logout button event
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Ensure old listener is removed before adding new one
        const oldLogoutListener = logoutBtn._logoutListener;
        if (oldLogoutListener) {
            logoutBtn.removeEventListener('click', oldLogoutListener);
        }
        const newLogoutListener = () => {
            if (app && typeof app.logout === 'function') {
                app.logout();
            }
        };
        logoutBtn.addEventListener('click', newLogoutListener);
        logoutBtn._logoutListener = newLogoutListener; // Store reference
    }
    
    // Re-attach nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        // Ensure old listeners are removed before adding new ones to prevent duplicates
        const oldListener = btn._navListener; // Store listener reference
        if (oldListener) {
            btn.removeEventListener('click', oldListener);
        }
        const newListener = (e) => {
            const section = e.currentTarget.dataset.section;
            if (app && typeof app.showSection === 'function') {
                app.showSection(section);
            }
        };
        btn.addEventListener('click', newListener);
        btn._navListener = newListener; // Store reference
    });
    
    // Re-attach dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        const oldDarkModeListener = darkModeToggle._darkModeListener;
        if (oldDarkModeListener) {
            darkModeToggle.removeEventListener('change', oldDarkModeListener);
        }
        const newDarkModeListener = (e) => {
            if (app && typeof app.toggleDarkMode === 'function') {
                app.toggleDarkMode(e.target.checked);
            }
        };
        darkModeToggle.addEventListener('change', newDarkModeListener);
        darkModeToggle._darkModeListener = newDarkModeListener;
    }
    
    // Re-attach data management buttons
    const buttons = [
        { id: 'generateTestData', method: 'generateTestData' },
        { id: 'clearData', method: 'clearAllData' },
        { id: 'exportJSON', method: 'exportData', args: ['json'] },
        { id: 'exportCSV', method: 'exportData', args: ['csv'] },
        { id: 'exportPDF', method: 'exportPDF' }
    ];
    
    buttons.forEach(({ id, method, args = [] }) => {
        const btn = document.getElementById(id);
        if (btn) {
            // Remove previous listener if it exists
            const oldBtnListener = btn._btnListener;
            if (oldBtnListener) {
                btn.removeEventListener('click', oldBtnListener);
            }

            const newBtnListener = () => {
                if (app && typeof app[method] === 'function') {
                    try {
                        app[method](...args);
                    } catch (e) {
                        if (app.showStatus) {
                            app.showStatus(`${method} error: ${e.message}`, 'error');
                        }
                        console.error(`${method} error:`, e);
                    }
                }
            };
            btn.addEventListener('click', newBtnListener);
            btn._btnListener = newBtnListener; // Store reference to the new listener
        }
    });
    
    // Re-attach import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        const oldImportBtnListener = importBtn._importBtnListener;
        if (oldImportBtnListener) {
            importBtn.removeEventListener('click', oldImportBtnListener);
        }
        const newImportBtnListener = () => {
            try {
                document.getElementById('importFile').click();
            } catch (e) {
                if (app && app.showStatus) {
                    app.showStatus('Import error: ' + e.message, 'error');
                }
            }
        };
        importBtn.addEventListener('click', newImportBtnListener);
        importBtn._importBtnListener = newImportBtnListener;
    }
    
    // Re-attach import file input
    const importFile = document.getElementById('importFile');
    if (importFile) {
        const oldImportFileListener = importFile._importFileListener;
        if (oldImportFileListener) {
            importFile.removeEventListener('change', oldImportFileListener);
        }
        const newImportFileListener = (e) => {
            try {
                if (app && typeof app.importData === 'function') {
                    app.importData(e.target.files[0]);
                }
            } catch (e) {
                if (app && app.showStatus) {
                    app.showStatus('Import error: ' + e.message, 'error');
                }
            }
        };
        importFile.addEventListener('change', newImportFileListener);
        importFile._importFileListener = newImportFileListener;
    }
    
    // Re-attach chart period selector
    const chartPeriod = document.getElementById('chartPeriod');
    if (chartPeriod) {
        const oldChartPeriodListener = chartPeriod._chartPeriodListener;
        if (oldChartPeriodListener) {
            chartPeriod.removeEventListener('change', oldChartPeriodListener);
        }
        const newChartPeriodListener = () => {
            if (app && typeof app.updateCharts === 'function') {
                app.updateCharts();
            }
        };
        chartPeriod.addEventListener('change', newChartPeriodListener);
        chartPeriod._chartPeriodListener = newChartPeriodListener;
    }
    
    // Re-attach sortable headers
    document.querySelectorAll('.sortable').forEach(header => {
        const oldSortableListener = header._sortableListener;
        if (oldSortableListener) {
            header.removeEventListener('click', oldSortableListener);
        }
        const newSortableListener = (e) => {
            const column = e.currentTarget.dataset.sort;
            if (app && typeof app.sortContributions === 'function') {
                app.sortContributions(column);
            }
        };
        header.addEventListener('click', newSortableListener);
        header._sortableListener = newSortableListener;
    });
    
    // Re-attach search and filter elements
    const filterElements = [
        // { id: 'searchInput', event: 'input', method: 'renderContributions' }, // Removed as searchInput is not in HTML
        { id: 'categoryFilter', event: 'change', method: 'renderContributions' },
        { id: 'memberFilter', event: 'change', method: 'renderContributions' },
        { id: 'startDate', event: 'change', method: 'renderContributions' },
        { id: 'endDate', event: 'change', method: 'renderContributions' },
        { id: 'resetFilters', event: 'click', method: 'resetFilters' },
        { id: 'searchBtn', event: 'click', method: 'renderContributions' }
    ];
    
    filterElements.forEach(({ id, event, method }) => {
        const element = document.getElementById(id);
        if (element) {
            const oldFilterListener = element._filterListener;
            if (oldFilterListener) {
                element.removeEventListener(event, oldFilterListener);
            }
            const newFilterListener = () => {
                if (app && typeof app[method] === 'function') {
                    app[method]();
                }
            };
            element.addEventListener(event, newFilterListener);
            element._filterListener = newFilterListener;
        }
    });
    
    // Re-attach contribution form
    const contributionForm = document.getElementById('contributionForm');
    if (contributionForm) {
        const oldContributionFormListener = contributionForm._formListener;
        if (oldContributionFormListener) {
            contributionForm.removeEventListener('submit', oldContributionFormListener);
        }
        const newContributionFormListener = (e) => {
            e.preventDefault();
            if (app && typeof app.handleAddContribution === 'function') {
                app.handleAddContribution();
            }
        };
        contributionForm.addEventListener('submit', newContributionFormListener);
        contributionForm._formListener = newContributionFormListener;
    }
    
    // Re-attach cancel edit button
    const cancelEdit = document.getElementById('cancelEdit');
    if (cancelEdit) {
        const oldCancelEditListener = cancelEdit._cancelEditListener;
        if (oldCancelEditListener) {
            cancelEdit.removeEventListener('click', oldCancelEditListener);
        }
        const newCancelEditListener = () => {
            if (app && typeof app.cancelEdit === 'function') {
                app.cancelEdit();
            }
        };
        cancelEdit.addEventListener('click', newCancelEditListener);
        cancelEdit._cancelEditListener = newCancelEditListener;
    }
    
    console.log('Event listeners re-attached successfully');
}

// Global error handler
window.addEventListener('error', function(event) {
    const statusDiv = document.getElementById('dataStatus');
    if (statusDiv) {
        statusDiv.textContent = 'JavaScript Error: ' + event.message + ' at ' + event.filename + ':' + event.lineno;
        statusDiv.className = 'status-message error';
        statusDiv.classList.remove('hidden');
    }
    console.error('Global JS Error:', event.message, event.filename, event.lineno, event.error);
});

// Simple validation for member selection - doesn't interfere with continue button
function setupMemberValidation() {
    const memberSelect = document.getElementById('memberSelect');
    const newMember = document.getElementById('newMember');
    const continueBtn = document.getElementById('continueBtn');
    const memberError = document.getElementById('memberError');
    
    if (!memberSelect || !newMember || !continueBtn || !memberError) {
        return;
    }
    
    function validate() {
        if ((memberSelect.value && memberSelect.value !== '') || (newMember.value && newMember.value.trim() !== '')) {
            continueBtn.disabled = false;
            memberError.classList.add('hidden');
        } else {
            continueBtn.disabled = true;
        }
    }
    
    memberSelect.addEventListener('change', validate);
    newMember.addEventListener('input', validate);
    validate(); // Initial validation
}

// Call setupMemberValidation when user selection is shown
document.addEventListener('DOMContentLoaded', () => {
    // Watch for user selection to appear and setup validation
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                const userSelection = document.getElementById('userSelection');
                // Check if userSelection exists and is no longer hidden
                if (userSelection && !userSelection.classList.contains('hidden')) {
                    setupMemberValidation();
                    observer.disconnect(); // Stop observing once set up
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true, // Observe attribute changes to catch classList modifications
        attributeFilter: ['class']
    });
});
