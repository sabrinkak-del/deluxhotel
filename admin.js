import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let allBookings = [];
let currentFilter = 'all';
let currentEditingBookingId = null;

async function loadBookings() {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms (
          name_he,
          room_type
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allBookings = bookings || [];
    calculateStats();
    renderBookings();
  } catch (error) {
    console.error('Error loading bookings:', error);
    showError('שגיאה בטעינת ההזמנות');
  }
}

function calculateStats() {
  const totalBookings = allBookings.length;

  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed');
  const totalRooms = 30;
  const bookedRooms = confirmedBookings.length;
  const occupancy = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = allBookings
    .filter(b => {
      const bookingDate = new Date(b.created_at);
      return bookingDate.getMonth() === currentMonth &&
             bookingDate.getFullYear() === currentYear &&
             b.status !== 'cancelled';
    })
    .reduce((sum, b) => sum + b.total_price, 0);

  const availableRooms = totalRooms - bookedRooms;

  document.getElementById('total-bookings').textContent = totalBookings;
  document.getElementById('occupancy').textContent = `${occupancy}%`;
  document.getElementById('monthly-revenue').textContent = `₪${monthlyRevenue.toLocaleString()}`;
  document.getElementById('available-rooms').textContent = availableRooms;
}

function renderBookings() {
  const container = document.getElementById('bookings-container');

  let filteredBookings = allBookings;
  if (currentFilter !== 'all') {
    filteredBookings = allBookings.filter(b => b.status === currentFilter);
  }

  if (filteredBookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <h3>אין הזמנות להצגה</h3>
        <p>לא נמצאו הזמנות בקטגוריה זו</p>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>פעולות</th>
            <th>סטטוס</th>
            <th>צ'ק-אאוט</th>
            <th>צ'ק-אין</th>
            <th>סוג חדר</th>
            <th>שם האורח</th>
            <th># המנה</th>
          </tr>
        </thead>
        <tbody>
          ${filteredBookings.map(booking => `
            <tr>
              <td>
                <div class="actions">
                  <button class="action-btn edit-btn" onclick="openEditModal('${booking.id}', '${booking.status}')" title="עריכה">✏️</button>
                  <button class="action-btn delete-btn" onclick="deleteBooking('${booking.id}')" title="מחיקה">🗑️</button>
                </div>
              </td>
              <td>
                <span class="status-badge status-${booking.status}">
                  ${getStatusText(booking.status)}
                </span>
              </td>
              <td>${formatDate(booking.check_out_date)}</td>
              <td>${formatDate(booking.check_in_date)}</td>
              <td>${booking.rooms?.name_he || 'לא ידוע'}</td>
              <td>
                <div class="guest-info">
                  <span class="guest-name">${booking.guest_name}</span>
                  <span class="guest-contact">${booking.guest_phone}</span>
                </div>
              </td>
              <td><span class="booking-id">BK-${booking.id.slice(0, 4).toUpperCase()}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL');
}

function getStatusText(status) {
  const statusMap = {
    'confirmed': 'מאושר',
    'pending': 'ממתין',
    'cancelled': 'מבוטל'
  };
  return statusMap[status] || status;
}

function showError(message) {
  const container = document.getElementById('bookings-container');
  container.innerHTML = `
    <div class="empty-state">
      <div class="icon">⚠️</div>
      <h3>${message}</h3>
    </div>
  `;
}

window.openEditModal = function(bookingId, currentStatus) {
  currentEditingBookingId = bookingId;
  document.getElementById('booking-status').value = currentStatus;
  document.getElementById('edit-modal').classList.add('show');
};

window.closeEditModal = function() {
  currentEditingBookingId = null;
  document.getElementById('edit-modal').classList.remove('show');
};

window.deleteBooking = async function(bookingId) {
  if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;

    await loadBookings();
    alert('ההזמנה נמחקה בהצלחה');
  } catch (error) {
    console.error('Error deleting booking:', error);
    alert('שגיאה במחיקת ההזמנה');
  }
};

document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentEditingBookingId) return;

  const newStatus = document.getElementById('booking-status').value;

  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', currentEditingBookingId);

    if (error) throw error;

    closeEditModal();
    await loadBookings();
    alert('הסטטוס עודכן בהצלחה');
  } catch (error) {
    console.error('Error updating booking:', error);
    alert('שגיאה בעדכון הסטטוס');
  }
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentFilter = btn.dataset.filter;
    renderBookings();
  });
});

document.getElementById('edit-modal').addEventListener('click', (e) => {
  if (e.target.id === 'edit-modal') {
    closeEditModal();
  }
});

loadBookings();
