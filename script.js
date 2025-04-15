// تنظیمات Supabase
const supabaseUrl = 'https://bkdkhutslnngfrjrqttc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGtodXRzbG5uZ2ZyanJxdHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NTc3MzcsImV4cCI6MjA2MDIzMzczN30.3qXN78oZM1Kt26iKVn3Q5DJcePzyEOI_SOwm2Op4KVQ';
const client = supabase.createClient(supabaseUrl, supabaseKey);

// عناصر DOM
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const dropzone = document.getElementById('dropzone');
const preview = document.getElementById('preview');
const gallery = document.getElementById('gallery');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalName = document.getElementById('modal-name');
const downloadBtn = document.getElementById('download-btn');
const deleteBtn = document.getElementById('delete-btn');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const toast = document.getElementById('toast');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl = document.getElementById('total-pages');

// متغیرهای سراسری
let currentFile = null;
let allImages = [];
let filteredImages = [];
let currentPage = 1;
const imagesPerPage = 12;
let totalPages = 1;

// تنظیمات اولیه
function init() {
    try {
        // بارگذاری تم و تنظیم رویدادها
        loadTheme();
        setupEventListeners();
        
        // بارگذاری فوری گالری در ابتدای بارگذاری سایت
        loadGallery().catch(err => {
            console.error('خطا در بارگذاری اولیه گالری:', err);
            showToast('خطا در بارگذاری گالری. لطفاً صفحه را رفرش کنید.', 'error');
        });
    } catch (err) {
        console.error('خطا در راه‌اندازی برنامه:', err);
    }
}

// نمایش/مخفی کردن loading
function toggleLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

// مدیریت تم (روشن/تاریک)
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    console.log('Theme loaded:', savedTheme); // برای دیباگ
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    console.log('Toggling theme from', currentTheme, 'to', newTheme); // برای دیباگ
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    showToast(`تم ${newTheme === 'dark' ? 'تاریک' : 'روشن'} فعال شد`, 'success');
}

function updateThemeIcon(theme) {
    if (!themeToggleBtn) {
        console.error('Theme toggle button not found!');
        return;
    }
    
    themeToggleBtn.innerHTML = theme === 'dark' 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
}

// تنظیم رویدادها
function setupEventListeners() {
    // آپلود فایل
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // جستجو
    searchBtn.addEventListener('click', searchImages);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') searchImages();
    });
    
    // تغییر نمای گالری
    gridViewBtn.addEventListener('click', () => changeGalleryView('grid'));
    listViewBtn.addEventListener('click', () => changeGalleryView('list'));
    
    // مودال ها
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) closeImageModal();
    });
    
    document.querySelector('.close').addEventListener('click', closeImageModal);
    
    // تصحیح رویداد دکمه‌ها
    deleteBtn.addEventListener('click', showDeleteConfirmation);
    
    confirmDeleteBtn.addEventListener('click', deleteImage);
    cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);

    // رویدادهای مودال تغییر نام
    document.getElementById('save-name-btn').addEventListener('click', renameImage);
    document.getElementById('cancel-rename-btn').addEventListener('click', closeRenameModal);
    
    // تغییر تم
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // صفحه بندی
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
}

// مدیریت فایل های انتخاب شده
function handleFileSelect(e) {
    handleFiles(e.target.files);
}

function handleFiles(files) {
    preview.innerHTML = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.match('image.*')) continue;
        
        const reader = new FileReader();
        reader.onload = (function(theFile) {
            return function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="${theFile.name}">
                    <button class="remove-preview">×</button>
                `;
                
                previewItem.querySelector('.remove-preview').addEventListener('click', function() {
                    this.parentNode.remove();
                });
                
                preview.appendChild(previewItem);
                uploadImage(theFile);
            };
        })(file);
        reader.readAsDataURL(file);
    }
}

// آپلود عکس به Supabase با بهبود کارایی
async function uploadImage(file) {
    try {
        toggleLoading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `public/${fileName}`;

        // بررسی اندازه فایل
        if (file.size > 10 * 1024 * 1024) { // 10 مگابایت
            showToast('حجم فایل بیش از حد مجاز است (حداکثر 10 مگابایت)', 'error');
            return;
        }

        // آپلود فایل
        const { error } = await client.storage
            .from('images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // پاک کردن کش برای مطمئن شدن از بارگذاری مجدد
        sessionStorage.removeItem('galleryImages');
        
        showToast('عکس با موفقیت آپلود شد', 'success');
        
        // بارگذاری مجدد گالری با تاخیر کم
        setTimeout(() => loadGallery(), 500);
    } catch (error) {
        console.error('خطا در آپلود:', error);
        showToast('خطا در آپلود عکس', 'error');
    } finally {
        toggleLoading(false);
    }
}

// بهبود سرعت بارگذاری گالری
async function loadGallery() {
    try {
        toggleLoading(true);
        
        // بررسی وجود داده‌های ذخیره شده برای افزایش سرعت
        const cachedImages = sessionStorage.getItem('galleryImages');
        const lastUpdate = sessionStorage.getItem('lastGalleryUpdate');
        const now = Date.now();
        
        // استفاده از کش اگر کمتر از 30 ثانیه از آخرین به‌روزرسانی گذشته باشد
        if (cachedImages && lastUpdate && (now - parseInt(lastUpdate) < 30000)) {
            allImages = JSON.parse(cachedImages);
            filteredImages = [...allImages];
            totalPages = Math.ceil(filteredImages.length / imagesPerPage);
            updatePagination();
            displayImages();
            toggleLoading(false);
            return;
        }
        
        const { data: files, error } = await client.storage
            .from('images')
            .list('public', {
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) throw error;

        allImages = files || [];
        
        // نمایش پیام اگر هیچ عکسی وجود نداشت
        if (allImages.length === 0) {
            showToast('هیچ عکسی برای نمایش وجود ندارد. می‌توانید عکس جدید آپلود کنید.', 'info');
        }
        
        // ذخیره سازی داده‌ها برای استفاده‌های بعدی
        sessionStorage.setItem('galleryImages', JSON.stringify(allImages));
        sessionStorage.setItem('lastGalleryUpdate', now.toString());
        
        filteredImages = [...allImages];
        totalPages = Math.ceil(filteredImages.length / imagesPerPage);
        updatePagination();
        displayImages();
        
        return allImages; // برگرداندن نتیجه برای استفاده در فراخوانی‌ها
    } catch (error) {
        console.error('خطا در بارگذاری گالری:', error);
        showToast('خطا در بارگذاری گالری', 'error');
        throw error; // انتشار خطا برای مدیریت در سطح بالاتر
    } finally {
        toggleLoading(false);
    }
}

// نمایش عکس‌ها در گالری
async function loadGallery() {
    try {
        toggleLoading(true);
        
        // بررسی وجود داده‌های ذخیره شده برای افزایش سرعت
        const cachedImages = sessionStorage.getItem('galleryImages');
        const lastUpdate = sessionStorage.getItem('lastGalleryUpdate');
        const now = Date.now();
        
        // استفاده از کش اگر کمتر از 30 ثانیه از آخرین به‌روزرسانی گذشته باشد
        if (cachedImages && lastUpdate && (now - parseInt(lastUpdate) < 30000)) {
            allImages = JSON.parse(cachedImages);
            filteredImages = [...allImages];
            totalPages = Math.ceil(filteredImages.length / imagesPerPage);
            updatePagination();
            displayImages();
            toggleLoading(false);
            return;
        }
        
        const { data: files, error } = await client.storage
            .from('images')
            .list('public', {
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) throw error;

        allImages = files || [];
        // ذخیره سازی داده‌ها برای استفاده‌های بعدی
        sessionStorage.setItem('galleryImages', JSON.stringify(allImages));
        sessionStorage.setItem('lastGalleryUpdate', now.toString());
        
        filteredImages = [...allImages];
        totalPages = Math.ceil(filteredImages.length / imagesPerPage);
        updatePagination();
        displayImages();
    } catch (error) {
        console.error('خطا در بارگذاری گالری:', error);
        showToast('خطا در بارگذاری گالری', 'error');
    } finally {
        toggleLoading(false);
    }
}

// نمایش تصاویر فیلتر شده و صفحه‌بندی شده
function displayImages() {
    const start = (currentPage - 1) * imagesPerPage;
    const end = start + imagesPerPage;
    const paginated = filteredImages.slice(start, end);
    
    gallery.innerHTML = '';
    
    if (paginated.length === 0) {
        gallery.innerHTML = '<div class="no-images">هیچ عکسی یافت نشد</div>';
        return;
    }
    
    paginated.forEach(file => {
        const { data: { publicUrl } } = client.storage
            .from('images')
            .getPublicUrl(`public/${file.name}`);
        
        const date = new Date(file.created_at || Date.now()).toLocaleDateString('fa-IR');
        
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.dataset.filename = file.name;
        
        const viewType = gallery.classList.contains('list-view') ? 'list' : 'grid';
        
        if (viewType === 'grid') {
            galleryItem.innerHTML = `
                <img src="${publicUrl}" alt="${file.name}">
                <div class="item-info">
                    <div class="item-name">${file.name.split('-').pop()}</div>
                    <div class="item-date">${date}</div>
                </div>
            `;
        } else {
            galleryItem.innerHTML = `
                <img src="${publicUrl}" alt="${file.name}">
                <div class="item-info">
                    <div class="item-name">${file.name.split('-').pop()}</div>
                    <div class="item-date">${date}</div>
                    <div class="item-actions">
                        <button class="view-image-btn"><i class="fas fa-eye"></i></button>
                        <button class="download-image-btn"><i class="fas fa-download"></i></button>
                        <button class="delete-image-btn"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            
            galleryItem.querySelector('.view-image-btn').addEventListener('click', () => openImageModal(file, publicUrl));
            galleryItem.querySelector('.download-image-btn').addEventListener('click', () => downloadImageByUrl(publicUrl, file.name));
            galleryItem.querySelector('.delete-image-btn').addEventListener('click', () => {
                currentFile = file;
                showDeleteConfirmation();
            });
        }
        
        if (viewType === 'grid') {
            galleryItem.addEventListener('click', () => openImageModal(file, publicUrl));
        }
        
        gallery.appendChild(galleryItem);
    });
}

// مدیریت مودال ها
function openImageModal(file, url) {
    modalImage.src = url;
    modalName.textContent = file.name.split('-').pop();
    currentFile = file;
    imageModal.style.display = 'flex';
    
    // تصحیح رویداد دانلود
    downloadBtn.onclick = function() {
        downloadImageByUrl(url, file.name.split('-').pop());
    };

    // اضافه کردن رویداد تغییر نام
    document.getElementById('edit-name-btn').onclick = function() {
        showRenameModal(file);
    };
}

function closeImageModal() {
    imageModal.style.display = 'none';
    modalImage.src = '';
}

function showDeleteConfirmation() {
    deleteConfirmModal.style.display = 'flex';
}

function closeDeleteConfirmModal() {
    deleteConfirmModal.style.display = 'none';
}

// عملیات روی عکس ها
async function deleteImage() {
    if (!currentFile) return;
    
    try {
        toggleLoading(true);
        
        const { error } = await client.storage
            .from('images')
            .remove([`public/${currentFile.name}`]);
        
        if (error) throw error;
        
        showToast('عکس با موفقیت حذف شد', 'success');
        closeDeleteConfirmModal();
        closeImageModal();
        loadGallery();
    } catch (error) {
        console.error('خطا در حذف عکس:', error);
        showToast('خطا در حذف عکس', 'error');
    } finally {
        toggleLoading(false);
    }
}

function downloadImageByUrl(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// جستجو
function searchImages() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        filteredImages = [...allImages];
    } else {
        filteredImages = allImages.filter(file => 
            file.name.toLowerCase().includes(query)
        );
    }
    
    currentPage = 1;
    totalPages = Math.ceil(filteredImages.length / imagesPerPage);
    updatePagination();
    displayImages();
}

// مدیریت نمای گالری
function changeGalleryView(viewType) {
    if (viewType === 'grid') {
        gallery.classList.add('grid-view');
        gallery.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    } else {
        gallery.classList.add('list-view');
        gallery.classList.remove('grid-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
    }
    
    localStorage.setItem('galleryView', viewType);
    displayImages();
}

// صفحه بندی
function updatePagination() {
    currentPageEl.textContent = currentPage;
    totalPagesEl.textContent = totalPages || 1;
    
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        updatePagination();
        displayImages();
        window.scrollTo(0, 0);
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updatePagination();
        displayImages();
        window.scrollTo(0, 0);
    }
}

// نمایش پیام toast
function showToast(message, type) {
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

// اضافه کردن تابع تغییر نام عکس
function showRenameModal(file) {
    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('new-filename');
    
    // نمایش نام فعلی فایل
    input.value = file.name.split('-').pop();
    
    // نمایش مودال
    modal.style.display = 'flex';
}

function closeRenameModal() {
    document.getElementById('rename-modal').style.display = 'none';
}

async function renameImage() {
    if (!currentFile) return;
    
    const newName = document.getElementById('new-filename').value.trim();
    if (!newName) {
        showToast('نام فایل نمی‌تواند خالی باشد', 'error');
        return;
    }
    
    try {
        toggleLoading(true);
        
        // استخراج بخش‌های مسیر فایل
        const oldPath = `public/${currentFile.name}`;
        const nameParts = currentFile.name.split('-');
        const timestamp = nameParts[0]; // حفظ timestamp برای حفظ ترتیب
        const randomId = nameParts[1]; // حفظ شناسه تصادفی
        const extension = currentFile.name.split('.').pop();
        
        // ایجاد نام جدید با حفظ timestamp
        const newFilename = `${timestamp}-${randomId}-${newName}.${extension}`;
        const newPath = `public/${newFilename}`;
        
        // دریافت فایل فعلی
        const { data: fileData, error: downloadError } = await client.storage
            .from('images')
            .download(oldPath);
            
        if (downloadError) throw downloadError;
        
        // آپلود فایل با نام جدید
        const { error: uploadError } = await client.storage
            .from('images')
            .upload(newPath, fileData, {
                cacheControl: '3600',
                upsert: true
            });
            
        if (uploadError) throw uploadError;
        
        // حذف فایل قدیمی
        const { error: deleteError } = await client.storage
            .from('images')
            .remove([oldPath]);
            
        if (deleteError) throw deleteError;
        
        showToast('نام عکس با موفقیت تغییر یافت', 'success');
        closeRenameModal();
        closeImageModal();
        
        // پاک کردن کش گالری برای بارگذاری مجدد
        sessionStorage.removeItem('galleryImages');
        
        loadGallery();
    } catch (error) {
        console.error('خطا در تغییر نام عکس:', error);
        showToast('خطا در تغییر نام عکس', 'error');
    } finally {
        toggleLoading(false);
    }
}

// شروع برنامه بعد از بارگذاری کامل صفحه
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded, initializing app...');
    // اجرا با تاخیر کوتاه برای اطمینان از بارگذاری کامل DOM
    setTimeout(init, 100);
}); 