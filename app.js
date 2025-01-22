
    const supabaseUrl = 'https://ttknpqkivcyktqjhoakz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a25wcWtpdmN5a3RxamhvYWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1ODAxMjcsImV4cCI6MjA1MzE1NjEyN30.gBLwawXaurnS4_AhcMzKfVegb984_31e1m3SLvJ4l7w'
    // const supabase = supabase.createClient(supabaseUrl, supabaseKey);
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    async function signUp() {
        const email = document.getElementById('email-signup').value;
        const password = document.getElementById('password-signup').value;
        const username = document.getElementById('username').value;

        const { user, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('Sign-up successful! Please log in.');
            toggleForms();
        }
    }

    async function signIn() {
        const email = document.getElementById('email-signin').value;
        const password = document.getElementById('password-signin').value;
    
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
    
        if (error) {
            alert('Error: ' + error.message);
        } else if (data && data.user) {
            alert('Sign-in successful! Welcome ' + data.user.email);
        }
    }
    

