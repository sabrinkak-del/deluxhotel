import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let searchParams = {};
let selectedRoom = null;

function setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkin').setAttribute('min', today);
    document.getElementById('checkout').setAttribute('min', today);
}

function setupDateValidation() {
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');

    checkinInput.addEventListener('change', function() {
        const checkinDate = new Date(this.value);
        checkinDate.setDate(checkinDate.getDate() + 1);
        const minCheckout = checkinDate.toISOString().split('T')[0];
        checkoutInput.setAttribute('min', minCheckout);

        if (checkoutInput.value && new Date(checkoutInput.value) <= new Date(this.value)) {
            checkoutInput.value = minCheckout;
        }
    });
}

function calculateNights(checkin, checkout) {
    const start = new Date(checkin);
    const end = new Date(checkout);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

async function checkRoomAvailability(roomId, checkinDate, checkoutDate) {
    const { data: room } = await supabase
        .from('rooms')
        .select('total_rooms')
        .eq('id', roomId)
        .maybeSingle();

    if (!room) return 0;

    const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('room_id', roomId)
        .eq('status', 'confirmed')
        .or(`and(check_in_date.lte.${checkoutDate},check_out_date.gte.${checkinDate})`);

    const bookedRooms = bookings ? bookings.length : 0;
    return room.total_rooms - bookedRooms;
}

function showLoading() {
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
    setTimeout(() => {
        errorDiv.classList.remove('active');
    }, 5000);
}

function updateSteps(activeStep) {
    ['step1', 'step2', 'step3'].forEach(step => {
        document.getElementById(step).classList.remove('active');
    });
    document.getElementById(`step${activeStep}`).classList.add('active');
}

async function searchRooms(e) {
    e.preventDefault();

    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const guests = parseInt(document.getElementById('guests').value);

    if (!checkin || !checkout) {
        showError('אנא בחרו תאריכי כניסה ויציאה');
        return;
    }

    if (new Date(checkout) <= new Date(checkin)) {
        showError('תאריך היציאה חייב להיות אחרי תאריך הכניסה');
        return;
    }

    searchParams = { checkin, checkout, guests };
    const nights = calculateNights(checkin, checkout);

    showLoading();
    document.getElementById('resultsSection').classList.remove('active');

    try {
        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .gte('max_guests', guests)
            .order('price_per_night', { ascending: true });

        if (error) throw error;

        const roomsWithAvailability = await Promise.all(
            rooms.map(async (room) => {
                const available = await checkRoomAvailability(room.id, checkin, checkout);
                return { ...room, available };
            })
        );

        displayRooms(roomsWithAvailability, nights);
        updateSteps(2);
    } catch (error) {
        console.error('Error:', error);
        showError('אירעה שגיאה בחיפוש החדרים. אנא נסו שוב.');
    } finally {
        hideLoading();
    }
}

function displayRooms(rooms, nights) {
    const grid = document.getElementById('roomsGrid');
    grid.innerHTML = '';

    if (rooms.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">לא נמצאו חדרים זמינים</p>';
        document.getElementById('resultsSection').classList.add('active');
        return;
    }

    rooms.forEach(room => {
        const totalPrice = room.price_per_night * nights;
        const features = Array.isArray(room.features) ? room.features : [];

        let availabilityClass = 'unavailable';
        let availabilityText = 'אזל מהמלאי';
        let buttonDisabled = true;

        if (room.available > 0) {
            buttonDisabled = false;
            if (room.available >= 5) {
                availabilityClass = 'available';
                availabilityText = `זמין - ${room.available} חדרים`;
            } else {
                availabilityClass = 'limited';
                availabilityText = `נותרו רק ${room.available} חדרים!`;
            }
        }

        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `
            <div class="room-image" style="background-image: url('${room.image_url}')"></div>
            <div class="room-details">
                <h3>${room.name_he}</h3>
                <p>${room.description_he}</p>
                <span class="availability-badge ${availabilityClass}">${availabilityText}</span>
                <div class="room-features">
                    ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
                </div>
                <div class="room-price">
                    <div class="price-details">
                        <div class="price">₪${room.price_per_night.toLocaleString()}</div>
                        <div class="total-price">סה"כ ${nights} לילות: ₪${totalPrice.toLocaleString()}</div>
                    </div>
                    <button class="select-btn" ${buttonDisabled ? 'disabled' : ''}
                        onclick="selectRoom('${room.id}', ${room.price_per_night}, ${nights}, '${room.name_he}')">
                        ${buttonDisabled ? 'לא זמין' : 'בחרו חדר זה'}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    document.getElementById('resultsSection').classList.add('active');
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

window.selectRoom = function(roomId, pricePerNight, nights, roomName) {
    selectedRoom = {
        id: roomId,
        name: roomName,
        pricePerNight,
        nights,
        totalPrice: pricePerNight * nights
    };

    displayBookingSummary();
    updateSteps(3);

    document.getElementById('bookingFormSection').classList.add('active');
    document.getElementById('bookingFormSection').scrollIntoView({ behavior: 'smooth' });
};

function displayBookingSummary() {
    const summaryDiv = document.getElementById('bookingSummary');

    const checkinFormatted = new Date(searchParams.checkin).toLocaleDateString('he-IL');
    const checkoutFormatted = new Date(searchParams.checkout).toLocaleDateString('he-IL');

    summaryDiv.innerHTML = `
        <h3 class="summary-title">סיכום ההזמנה</h3>
        <div class="summary-item">
            <span>סוג חדר:</span>
            <strong>${selectedRoom.name}</strong>
        </div>
        <div class="summary-item">
            <span>תאריך כניסה:</span>
            <strong>${checkinFormatted}</strong>
        </div>
        <div class="summary-item">
            <span>תאריך יציאה:</span>
            <strong>${checkoutFormatted}</strong>
        </div>
        <div class="summary-item">
            <span>מספר לילות:</span>
            <strong>${selectedRoom.nights}</strong>
        </div>
        <div class="summary-item">
            <span>מספר אורחים:</span>
            <strong>${searchParams.guests}</strong>
        </div>
        <div class="summary-item">
            <span>מחיר ללילה:</span>
            <strong>₪${selectedRoom.pricePerNight.toLocaleString()}</strong>
        </div>
        <div class="summary-item">
            <span>סה"כ לתשלום:</span>
            <strong>₪${selectedRoom.totalPrice.toLocaleString()}</strong>
        </div>
    `;
}

async function submitBooking(e) {
    e.preventDefault();

    const guestName = document.getElementById('guestName').value.trim();
    const guestEmail = document.getElementById('guestEmail').value.trim();
    const guestPhone = document.getElementById('guestPhone').value.trim();
    const specialRequests = document.getElementById('specialRequests').value.trim();

    if (!guestName || !guestEmail || !guestPhone) {
        showError('אנא מלאו את כל השדות החובה');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'שולח...';

    try {
        const available = await checkRoomAvailability(
            selectedRoom.id,
            searchParams.checkin,
            searchParams.checkout
        );

        if (available <= 0) {
            showError('מצטערים, החדר כבר לא זמין בתאריכים אלו');
            submitBtn.disabled = false;
            submitBtn.textContent = '✓ אשרו את ההזמנה';
            return;
        }

        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                room_id: selectedRoom.id,
                guest_name: guestName,
                guest_email: guestEmail,
                guest_phone: guestPhone,
                check_in_date: searchParams.checkin,
                check_out_date: searchParams.checkout,
                num_guests: searchParams.guests,
                total_price: selectedRoom.totalPrice,
                status: 'confirmed',
                special_requests: specialRequests
            }])
            .select()
            .maybeSingle();

        if (error) throw error;

        const bookingIdShort = data.id.substring(0, 8).toUpperCase();

        try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                    guestName,
                    guestEmail,
                    bookingId: bookingIdShort,
                    roomName: selectedRoom.name,
                    checkInDate: searchParams.checkin,
                    checkOutDate: searchParams.checkout,
                    numGuests: searchParams.guests,
                    nights: selectedRoom.nights,
                    totalPrice: selectedRoom.totalPrice,
                    specialRequests: specialRequests || undefined
                })
            });

            if (!emailResponse.ok) {
                console.error('Failed to send confirmation email');
            }
        } catch (emailError) {
            console.error('Error sending email:', emailError);
        }

        document.getElementById('bookingFormSection').classList.remove('active');
        document.getElementById('bookingId').textContent = bookingIdShort;
        document.getElementById('successMessage').classList.add('active');
        document.getElementById('successMessage').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error:', error);
        showError('אירעה שגיאה בביצוע ההזמנה. אנא נסו שוב או צרו קשר.');
        submitBtn.disabled = false;
        submitBtn.textContent = '✓ אשרו את ההזמנה';
    }
}

function loadSearchFromURL() {
    const params = new URLSearchParams(window.location.search);
    const checkin = params.get('checkin');
    const checkout = params.get('checkout');
    const guests = params.get('guests');

    if (checkin) document.getElementById('checkin').value = checkin;
    if (checkout) document.getElementById('checkout').value = checkout;
    if (guests) document.getElementById('guests').value = guests;

    if (checkin && checkout) {
        document.getElementById('searchForm').dispatchEvent(new Event('submit'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setMinDates();
    setupDateValidation();
    loadSearchFromURL();

    document.getElementById('searchForm').addEventListener('submit', searchRooms);
    document.getElementById('guestForm').addEventListener('submit', submitBooking);
});
