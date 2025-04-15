// تنظیمات Supabase
const supabaseUrl = 'https://bkdkhutslnngfrjrqttc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGtodXRzbG5uZ2ZyanJxdHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NTc3MzcsImV4cCI6MjA2MDIzMzczN30.3qXN78oZM1Kt26iKVn3Q5DJcePzyEOI_SOwm2Op4KVQ';
const client = supabase.createClient(supabaseUrl, supabaseKey);

// دسترسی گلوبال برای اسکریپت‌های کمکی
window.client = client;
window.handleLogin = handleLogin;
window.handleRegistration = handleRegistration;
window.handleResetPassword = handleResetPassword;

// عناصر DOM
const authMessage = document.getElementById('auth-message');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');

// متغیرهای سراسری
let currentPage = window.location.pathname.split('/').pop() || 'index.html';
console.log('Current page:', currentPage);

// راه‌اندازی اولیه
function init() {
    console.log('Initializing auth system...');
    setupFormEvents();
    setupPasswordToggles();
    checkAuthStatus();
}

// بررسی وضعیت احراز هویت
async function checkAuthStatus() {
    console.log('Checking auth status...');
    try {
        const { data: { user }, error } = await client.auth.getUser();
        console.log('Auth check result:', user ? 'User logged in' : 'No user', error);
        
        // اگر کاربر لاگین شده باشد و در صفحه لاگین یا ثبت‌نام باشد
        if (user && (currentPage === 'login.html' || currentPage === 'register.html')) {
            console.log('Redirecting logged in user to index page');
            window.location.href = 'index.html';
            return;
        }
        
        // اگر کاربر لاگین نشده باشد و در صفحه اصلی باشد
        if (!user && currentPage === 'index.html') {
            console.log('Redirecting non-logged in user to login page');
            window.location.href = 'login.html';
            return;
        }
        
        // اگر کاربر لاگین شده باشد و در صفحه اصلی باشد
        if (user && currentPage === 'index.html') {
            console.log('User is logged in and on index page, updating user info...');
            await updateUserInfo(user);
            
            // برای کاربر ادمین، نمایش دکمه مدیریت کاربران
            await checkIfAdmin(user);
        }
        
        // بررسی تأیید ایمیل
        if (user && !user.email_confirmed_at && currentPage === 'index.html') {
            showMessageInAuthPage('لطفاً ایمیل خود را تأیید کنید', 'error');
        }
        
    } catch (error) {
        console.error('خطا در بررسی وضعیت احراز هویت:', error);
    }
}

// بررسی اینکه آیا کاربر ادمین است
async function checkIfAdmin(user) {
    try {
        const { data, error } = await client
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (error) throw error;
        
        if (data && data.role === 'admin') {
            // اضافه کردن دکمه مدیریت کاربران به هدر
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                const adminBtn = document.createElement('button');
                adminBtn.id = 'admin-btn';
                adminBtn.className = 'logout-btn';
                adminBtn.innerHTML = '<i class="fas fa-users-cog"></i> مدیریت کاربران';
                adminBtn.style.backgroundColor = '#4CAF50';
                adminBtn.style.color = 'white';
                adminBtn.addEventListener('click', showUserManagement);
                
                // اضافه کردن قبل از دکمه خروج
                const logoutBtn = document.getElementById('logout-btn');
                headerActions.insertBefore(adminBtn, logoutBtn);
            }
        }
    } catch (error) {
        console.error('خطا در بررسی وضعیت ادمین:', error);
    }
}

// نمایش مودال مدیریت کاربران
async function showUserManagement() {
    // ایجاد مودال اگر از قبل وجود ندارد
    let userManagementModal = document.getElementById('user-management-modal');
    
    if (!userManagementModal) {
        userManagementModal = document.createElement('div');
        userManagementModal.id = 'user-management-modal';
        userManagementModal.className = 'modal';
        
        userManagementModal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; width: 90%;">
                <span class="close">&times;</span>
                <h3>مدیریت کاربران</h3>
                <div id="users-container" style="margin-top: 20px; max-height: 400px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="text-align: right; padding: 8px; border-bottom: 1px solid var(--border-color);">نام</th>
                                <th style="text-align: right; padding: 8px; border-bottom: 1px solid var(--border-color);">ایمیل</th>
                                <th style="text-align: right; padding: 8px; border-bottom: 1px solid var(--border-color);">نقش</th>
                                <th style="text-align: right; padding: 8px; border-bottom: 1px solid var(--border-color);">وضعیت</th>
                                <th style="text-align: right; padding: 8px; border-bottom: 1px solid var(--border-color);">عملیات</th>
                            </tr>
                        </thead>
                        <tbody id="users-list">
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 20px;">در حال بارگذاری...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.body.appendChild(userManagementModal);
        
        // اضافه کردن رویداد برای بستن مودال
        const closeBtn = userManagementModal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            userManagementModal.style.display = 'none';
        });
        
        // بستن مودال با کلیک بیرون از آن
        userManagementModal.addEventListener('click', (e) => {
            if (e.target === userManagementModal) {
                userManagementModal.style.display = 'none';
            }
        });
    }
    
    // نمایش مودال
    userManagementModal.style.display = 'flex';
    
    // بارگذاری لیست کاربران
    await loadUsers();
}

// بارگذاری لیست کاربران
async function loadUsers() {
    try {
        toggleLoading(true);
        
        const usersListElement = document.getElementById('users-list');
        if (!usersListElement) return;
        
        // دریافت همه کاربران از جدول profiles
        const { data: users, error } = await client
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (users && users.length > 0) {
            let usersHTML = '';
            
            for (const user of users) {
                // دریافت وضعیت کاربر از auth.users
                const { data: authData } = await client.auth.admin.getUserById(user.id).catch(() => ({ data: null }));
                
                const isConfirmed = authData && authData.user && authData.user.email_confirmed_at ? 'تأیید شده' : 'تأیید نشده';
                
                usersHTML += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${user.full_name || 'بدون نام'}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${user.email}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">
                            <select class="user-role-select" data-user-id="${user.id}" style="padding: 5px; border-radius: 4px;">
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>عادی</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدیر</option>
                            </select>
                        </td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${isConfirmed}</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">
                            <button class="delete-user-btn" data-user-id="${user.id}" style="background-color: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            usersListElement.innerHTML = usersHTML;
            
            // اضافه کردن رویدادها برای تغییر نقش و حذف
            document.querySelectorAll('.user-role-select').forEach(select => {
                select.addEventListener('change', handleRoleChange);
            });
            
            document.querySelectorAll('.delete-user-btn').forEach(button => {
                button.addEventListener('click', handleUserDelete);
            });
        } else {
            usersListElement.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">هیچ کاربری یافت نشد</td></tr>';
        }
    } catch (error) {
        console.error('خطا در بارگذاری کاربران:', error);
        showToast('خطا در بارگذاری لیست کاربران', 'error');
    } finally {
        toggleLoading(false);
    }
}

// مدیریت تغییر نقش کاربر
async function handleRoleChange(e) {
    const userId = e.target.dataset.userId;
    const newRole = e.target.value;
    
    try {
        toggleLoading(true);
        
        // به‌روزرسانی نقش در جدول profiles
        const { error } = await client
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('نقش کاربر با موفقیت تغییر یافت', 'success');
    } catch (error) {
        console.error('خطا در تغییر نقش کاربر:', error);
        showToast('خطا در تغییر نقش کاربر', 'error');
        // برگرداندن مقدار select به حالت قبل
        e.target.value = e.target.value === 'admin' ? 'user' : 'admin';
    } finally {
        toggleLoading(false);
    }
}

// مدیریت حذف کاربر
async function handleUserDelete(e) {
    if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    
    const userId = e.target.closest('.delete-user-btn').dataset.userId;
    
    try {
        toggleLoading(true);
        
        // حذف از جدول profiles
        const { error: profileError } = await client
            .from('profiles')
            .delete()
            .eq('id', userId);
        
        if (profileError) throw profileError;
        
        // حذف از auth.users نیاز به دسترسی service_role دارد
        // این عملیات معمولاً باید در سمت سرور انجام شود
        
        showToast('کاربر با موفقیت حذف شد', 'success');
        
        // به‌روزرسانی لیست کاربران
        await loadUsers();
    } catch (error) {
        console.error('خطا در حذف کاربر:', error);
        showToast('خطا در حذف کاربر', 'error');
    } finally {
        toggleLoading(false);
    }
}

// نمایش اطلاعات کاربر
async function updateUserInfo(user) {
    try {
        console.log('Updating user info for:', user.email);
        const usernameEl = document.getElementById('username');
        const userRoleEl = document.getElementById('user-role');
        
        if (usernameEl && userRoleEl) {
            // دریافت اطلاعات کاربر از جدول profiles
            const { data, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            console.log('Profile data retrieved:', data, 'Error:', error);
            
            if (error) {
                console.error('Error fetching profile:', error);
                
                // اگر خطای not_found باشد، یعنی پروفایل برای کاربر موجود نیست
                if (error.code === 'PGRST116') {
                    console.log('Profile not found, creating one...');
                    await createUserProfile(user);
                    
                    // دوباره تلاش برای دریافت پروفایل بعد از ایجاد
                    const { data: newData, error: newError } = await client
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    
                    if (newError) throw newError;
                    
                    if (newData) {
                        usernameEl.textContent = newData.full_name || user.email;
                        userRoleEl.textContent = newData.role === 'admin' ? 'مدیر' : 'عادی';
                        userRoleEl.className = 'role-badge ' + newData.role;
                        return;
                    }
                } else {
                    throw error;
                }
            }
            
            // نمایش نام کاربر و نقش
            if (data) {
                console.log('Setting user display name to:', data.full_name || user.email);
                usernameEl.textContent = data.full_name || user.email;
                userRoleEl.textContent = data.role === 'admin' ? 'مدیر' : 'عادی';
                userRoleEl.className = 'role-badge ' + data.role;
            } else {
                // اگر پروفایل برای کاربر موجود نیست، آن را ایجاد کنیم
                console.log('No profile data returned, creating profile...');
                await createUserProfile(user);
                
                // پس از ایجاد پروفایل، اطلاعات پیش‌فرض را نمایش می‌دهیم
                usernameEl.textContent = user.user_metadata?.full_name || user.email;
                userRoleEl.textContent = 'عادی';
                userRoleEl.className = 'role-badge user';
            }
        } else {
            console.error('Username or user role elements not found in DOM!');
        }
        
        // تنظیم رویداد دکمه خروج
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            // حذف هر رویداد قبلی تا از رویدادهای تکراری جلوگیری شود
            logoutBtn.removeEventListener('click', handleLogout);
            // افزودن رویداد جدید
            logoutBtn.addEventListener('click', handleLogout);
        }
    } catch (error) {
        console.error('خطا در به‌روزرسانی اطلاعات کاربر:', error);
    }
}

// ایجاد پروفایل کاربر اگر وجود نداشته باشد
async function createUserProfile(user) {
    try {
        const { error } = await client
            .from('profiles')
            .insert([
                {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || '',
                    email: user.email,
                    role: user.email === 'admin@gallery.com' ? 'admin' : 'user',
                    created_at: new Date().toISOString()
                }
            ]);
        
        if (error) throw error;
        
        console.log('پروفایل کاربر با موفقیت ایجاد شد');
    } catch (error) {
        console.error('خطا در ایجاد پروفایل کاربر:', error);
    }
}

// مدیریت خروج
async function handleLogout() {
    console.log('Logging out...');
    try {
        toggleLoading(true);
        const { error } = await client.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'login.html';
    } catch (error) {
        console.error('خطا در خروج از حساب کاربری:', error);
        showToast('خطا در خروج از حساب کاربری', 'error');
    } finally {
        toggleLoading(false);
    }
}

// تنظیم رویدادهای فرم‌ها
function setupFormEvents() {
    console.log('Setting up form events');
    
    // ثبت‌نام
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        console.log('Register form found, setting up listener');
        // حذف رویدادهای قبلی
        const clonedForm = registerForm.cloneNode(true);
        registerForm.parentNode.replaceChild(clonedForm, registerForm);
        
        // افزودن رویداد جدید
        clonedForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Register form submitted');
            await handleRegistration();
        });
    } else {
        console.log('Register form not found on this page');
    }
    
    // ورود
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('Login form found, setting up listener');
        // حذف رویدادهای قبلی
        const clonedForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(clonedForm, loginForm);
        
        // افزودن رویداد جدید
        clonedForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            await handleLogin();
        });
    } else {
        console.log('Login form not found on this page');
    }
    
    // بازیابی رمز عبور
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        console.log('Reset password form found, setting up listener');
        // حذف رویدادهای قبلی
        const clonedForm = resetPasswordForm.cloneNode(true);
        resetPasswordForm.parentNode.replaceChild(clonedForm, resetPasswordForm);
        
        // افزودن رویداد جدید
        clonedForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Reset password form submitted');
            await handleResetPassword();
        });
        
        // نمایش مودال بازیابی رمز عبور
        const forgotPasswordLink = document.getElementById('forgot-password');
        const resetPasswordModal = document.getElementById('reset-password-modal');
        
        if (forgotPasswordLink && resetPasswordModal) {
            console.log('Setting up forgot password modal');
            const closeBtn = resetPasswordModal.querySelector('.close');
            
            // حذف رویدادهای قبلی
            forgotPasswordLink.removeEventListener('click', null);
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Forgot password link clicked');
                resetPasswordModal.style.display = 'flex';
            });
            
            if (closeBtn) {
                closeBtn.removeEventListener('click', null);
                closeBtn.addEventListener('click', () => {
                    resetPasswordModal.style.display = 'none';
                });
            }
        }
    }
    
    // مودال موفقیت ثبت‌نام
    const gotoLoginBtn = document.getElementById('goto-login');
    if (gotoLoginBtn) {
        console.log('Setting up goto login button');
        // حذف رویدادهای قبلی
        gotoLoginBtn.removeEventListener('click', null);
        gotoLoginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
    
    // تنظیم رویدادهای دکمه‌های فرم
    document.querySelectorAll('button[type="submit"]').forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('Submit button clicked:', this.form?.id || 'unknown form');
            const form = this.closest('form');
            if (form) {
                // منتشر کردن رویداد submit برای فرم
                const event = new Event('submit', { cancelable: true });
                form.dispatchEvent(event);
                
                if (!event.defaultPrevented) {
                    e.preventDefault();
                }
            }
        });
    });
}

// مدیریت نمایش/مخفی کردن رمز عبور
function setupPasswordToggles() {
    console.log('Setting up password toggles');
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// مدیریت ثبت‌نام
async function handleRegistration() {
    console.log('Handling registration');
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        showMessageInAuthPage('رمزهای عبور مطابقت ندارند', 'error');
        return;
    }
    
    if (password.length < 8) {
        showMessageInAuthPage('رمز عبور باید حداقل 8 کاراکتر باشد', 'error');
        return;
    }
    
    toggleLoading(true);
    
    try {
        // ثبت‌نام کاربر
        const { data: { user }, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullname
                },
                emailRedirectTo: `${window.location.origin}/login.html`
            }
        });
        
        if (error) throw error;
        
        console.log("User created:", user);
        
        // ذخیره اطلاعات کاربر در جدول profiles
        const { error: profileError } = await client
            .from('profiles')
            .insert([
                {
                    id: user.id,
                    full_name: fullname,
                    email: email,
                    role: email === 'admin@gallery.com' ? 'admin' : 'user',
                    created_at: new Date().toISOString()
                }
            ]);
        
        if (profileError) {
            console.error("Profile creation error:", profileError);
            throw profileError;
        }
        
        // نمایش پیام موفقیت
        const successModal = document.getElementById('success-modal');
        if (successModal) {
            successModal.style.display = 'flex';
        } else {
            showMessageInAuthPage('ثبت‌نام با موفقیت انجام شد. لطفاً ایمیل خود را تأیید کنید.', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
        
    } catch (error) {
        console.error('خطا در ثبت‌نام:', error);
        
        if (error.message.includes('email already registered')) {
            showMessageInAuthPage('این ایمیل قبلاً ثبت شده است', 'error');
        } else {
            showMessageInAuthPage('خطا در ثبت‌نام: ' + error.message, 'error');
        }
    } finally {
        toggleLoading(false);
    }
}

// مدیریت ورود
async function handleLogin(email, password) {
    console.log('Handling login');
    // اگر پارامترها پاس داده شوند، از آنها استفاده می‌کنیم
    if (!email || !password) {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (!emailInput || !passwordInput) {
            console.error('Email or password input not found!');
            showMessageInAuthPage('خطا در فرم ورود. لطفاً صفحه را رفرش کنید.', 'error');
            return;
        }
        
        email = emailInput.value.trim();
        password = passwordInput.value;
    }
    
    // بررسی ورودی‌ها
    if (!email || !password) {
        showMessageInAuthPage('لطفاً ایمیل و رمز عبور را وارد کنید', 'error');
        return;
    }
    
    console.log('Login with email:', email);
    toggleLoading(true);
    
    try {
        // اگر کاربر admin باشد
        if (email === 'admin@gallery.com' && password === 'admin123') {
            console.log('Admin login detected');
            // ثبت‌نام اتوماتیک admin اگر وجود نداشته باشد
            const { data: { user: adminUser }, error: adminCheckError } = await client.auth.signInWithPassword({
                email,
                password
            });
            
            if (adminCheckError && adminCheckError.message.includes('Invalid login credentials')) {
                console.log('Admin user not found, creating admin account');
                // ایجاد کاربر admin
                const { data: { user }, error: signupError } = await client.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: 'مدیر سیستم',
                            role: 'admin'
                        }
                    }
                });
                
                if (signupError) throw signupError;
                
                // ذخیره اطلاعات admin در profiles
                const { error: profileError } = await client
                    .from('profiles')
                    .insert([
                        {
                            id: user.id,
                            full_name: 'مدیر سیستم',
                            email: email,
                            role: 'admin',
                            created_at: new Date().toISOString()
                        }
                    ]);
                
                if (profileError) throw profileError;
                
                // ورود خودکار
                const { error: loginError } = await client.auth.signInWithPassword({
                    email,
                    password
                });
                
                if (loginError) throw loginError;
            }
            
            // هدایت به صفحه اصلی
            window.location.href = 'index.html';
            return;
        }
        
        // ورود کاربر عادی
        console.log('Regular user login attempt');
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        console.log('Login successful, redirecting to index page');
        // هدایت به صفحه اصلی
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('خطا در ورود:', error);
        
        if (error.message.includes('Invalid login credentials')) {
            showMessageInAuthPage('ایمیل یا رمز عبور اشتباه است', 'error');
        } else {
            showMessageInAuthPage('خطا در ورود: ' + error.message, 'error');
        }
    } finally {
        toggleLoading(false);
    }
}

// مدیریت بازیابی رمز عبور
async function handleResetPassword() {
    console.log('Handling password reset');
    const email = document.getElementById('reset-email').value.trim();
    
    toggleLoading(true);
    
    try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login.html`
        });
        
        if (error) throw error;
        
        // بستن مودال
        document.getElementById('reset-password-modal').style.display = 'none';
        
        // نمایش پیام موفقیت
        showMessageInAuthPage('لینک بازیابی رمز عبور به ایمیل شما ارسال شد', 'success');
        
    } catch (error) {
        console.error('خطا در بازیابی رمز عبور:', error);
        showMessageInAuthPage('خطا در ارسال لینک بازیابی رمز عبور', 'error');
    } finally {
        toggleLoading(false);
    }
}

// نمایش پیام در صفحه احراز هویت
function showMessageInAuthPage(message, type) {
    if (!authMessage) return;
    
    authMessage.textContent = message;
    authMessage.className = 'auth-message';
    authMessage.classList.add(type);
    authMessage.style.display = 'block'; // اطمینان از نمایش پیام
}

// نمایش/مخفی کردن لودینگ
function toggleLoading(show) {
    if (!loading) return;
    loading.style.display = show ? 'flex' : 'none';
}

// نمایش toast
function showToast(message, type) {
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast';
    
    if (type) {
        toast.classList.add(type);
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// اجرای اسکریپت بعد از بارگذاری صفحه
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, initializing auth system...');
    init();
});

// اطمینان از اجرای اسکریپت حتی بعد از بارگذاری صفحه
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('Document already loaded, initializing auth system...');
    setTimeout(init, 1);
}

// بررسی صفحه ورود
if (currentPage === '') {
    window.location.href = 'login.html';
} 