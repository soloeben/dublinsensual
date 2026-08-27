import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'nzvyfthvtfvtiajvqbxe';
const DEFAULT_SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const env = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';

const form = document.querySelector('[data-guest-form]');
const dancerSelect = document.getElementById('guestDancerSelect');
const emailInput = document.getElementById('guestEmail');
const honeypot = document.getElementById('guestWebsite');
const submitButton = document.querySelector('.guest-submit');
const statusMessage = document.querySelector('[data-guest-status]');
const profilePreview = document.querySelector('[data-profile-preview]');
const profileImage = document.querySelector('[data-profile-image]');
const profileInitials = document.querySelector('[data-profile-initials]');
const profileName = document.querySelector('[data-profile-name]');
const profileLink = document.querySelector('[data-profile-link]');
const profileRole = document.querySelector('[data-profile-role]');

let supabase = null;
let guestDancers = [];

function setStatus(message, type = 'neutral') {
  statusMessage.textContent = message;
  statusMessage.dataset.status = type;
}

function setSubmitState(isBusy) {
  submitButton.disabled = isBusy || !dancerSelect.value || !emailInput.value.trim();
  submitButton.textContent = isBusy ? 'Submitting...' : 'Submit Email';
}

function getInstagramHandle(dancer) {
  if (dancer.instagram_handle) {
    return dancer.instagram_handle.startsWith('@')
      ? dancer.instagram_handle
      : `@${dancer.instagram_handle}`;
  }

  try {
    const url = new URL(dancer.instagram_url);
    const handle = url.pathname.split('/').filter(Boolean)[0];
    return handle ? `@${decodeURIComponent(handle)}` : 'Instagram profile';
  } catch {
    return 'Instagram profile';
  }
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function renderProfile(dancer) {
  if (!dancer) {
    profilePreview.hidden = true;
    return;
  }

  profileName.textContent = dancer.display_name;
  profileLink.textContent = getInstagramHandle(dancer);
  profileLink.href = dancer.instagram_url;
  profileRole.textContent = dancer.role_label || 'Guest dancer';
  profileInitials.textContent = getInitials(dancer.display_name);

  if (dancer.profile_image_url) {
    profileImage.hidden = false;
    profileImage.src = dancer.profile_image_url;
    profileImage.alt = `${dancer.display_name} profile image`;
  } else {
    profileImage.hidden = true;
    profileImage.removeAttribute('src');
    profileImage.alt = '';
  }

  profilePreview.hidden = false;
}

function populateDancers(dancers) {
  dancerSelect.innerHTML = '<option value="">Select your name</option>';
  dancers.forEach(dancer => {
    const option = document.createElement('option');
    option.value = dancer.id;
    option.textContent = dancer.display_name;
    dancerSelect.appendChild(option);
  });

  dancerSelect.disabled = dancers.length === 0;
  setStatus(
    dancers.length ? '' : 'No guest dancer names are available yet.',
    dancers.length ? 'neutral' : 'error'
  );
}

async function loadDancers() {
  if (!supabaseKey) {
    dancerSelect.innerHTML = '<option value="">Supabase key missing</option>';
    setStatus('Supabase is not configured yet. Add VITE_SUPABASE_PUBLISHABLE_KEY to enable this page.', 'error');
    return;
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  setStatus('Loading guest dancers...');
  const { data, error } = await supabase
    .from('guest_dancers')
    .select('id, display_name, instagram_url, instagram_handle, profile_image_url, role_label')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) {
    dancerSelect.innerHTML = '<option value="">Unable to load names</option>';
    setStatus('Guest dancer names could not be loaded. Please try again later.', 'error');
    return;
  }

  guestDancers = data || [];
  populateDancers(guestDancers);
}

dancerSelect.addEventListener('change', () => {
  const dancer = guestDancers.find(item => item.id === dancerSelect.value);
  renderProfile(dancer);
  setSubmitState(false);
});

emailInput.addEventListener('input', () => setSubmitState(false));

profileImage.addEventListener('error', () => {
  profileImage.hidden = true;
  profileImage.removeAttribute('src');
  profileImage.alt = '';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabase || !form.reportValidity()) return;

  const dancer = guestDancers.find(item => item.id === dancerSelect.value);
  const email = emailInput.value.trim().toLowerCase();
  if (!dancer || !email) return;

  if (honeypot.value) {
    form.reset();
    renderProfile(null);
    setStatus('Thank you. Your email has been received.', 'success');
    setSubmitState(false);
    return;
  }

  setSubmitState(true);
  setStatus('Submitting your email...');
  emailInput.blur();

  const { error } = await supabase.from('guest_dancer_signups').insert({
    guest_dancer_id: dancer.id,
    email
  });

  if (error) {
    const duplicateSignup = error.code === '23505';
    setStatus(
      duplicateSignup
        ? 'An email has already been submitted for this name.'
        : 'Your email could not be submitted. Please try again.',
      'error'
    );
    setSubmitState(false);
    return;
  }

  emailInput.value = '';
  setStatus('Thank you. Your email has been received.', 'success');
  setSubmitState(false);
});

loadDancers();
