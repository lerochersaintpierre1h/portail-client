// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDVvRxbKqlck7-V5uDZcsGqYXx7rEmMt4g",
  authDomain: "rochersaintpierre1h.firebaseapp.com",
  projectId: "rochersaintpierre1h",
  storageBucket: "rochersaintpierre1h.firebasestorage.app",
  messagingSenderId: "12413486620",
  appId: "1:12413486620:web:baede780cf1e204dc681d9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function clientApp() {
  return {
    loginEmail: '',
    loginPassword: '',
    showPassword: false,
    loginError: '',
    isAuthenticated: false,
    reservation: null,

    donnees: {
      taxeSejour: 1.65,
      prixMenage: 75,
      pctAcompte: 30
    },

    login() {
      this.loginError = '';
      const emailClean = this.loginEmail.trim().toLowerCase();

      if (this.loginPassword !== 'RocherSP1H') {
        this.loginError = "Mot de passe incorrect.";
        return;
      }

      // Récupération des données globales
      db.collection("locations").doc("rocher1H").get().then((doc) => {
        if (doc.exists && doc.data().donnees) {
          this.donnees = { ...this.donnees, ...doc.data().donnees };
        }
      }).catch(() => {});

      // Récupération de la réservation
      db.collection("locations").doc("rocher1H").collection("reservations")
        .get()
        .then((snapshot) => {
          let found = null;
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email && data.email.trim().toLowerCase() === emailClean) {
              found = data;
            }
          });

          if (found) {
            this.reservation = found;
            this.isAuthenticated = true;
          } else {
            this.loginError = "Aucune réservation trouvée avec cet e-mail.";
          }
        })
        .catch((err) => {
          console.error("Erreur Firestore :", err);
          this.loginError = "Erreur de connexion au serveur.";
        });
    },

    isBooking() {
      if (!this.reservation) return false;
      const orig = (this.reservation.origine || '').toLowerCase().trim();
      const code = (this.reservation.codeTarif || '').toLowerCase().trim();
      return orig === 'booking' || code === 'booking';
    },

    calcNights(start, end) {
      if (!start || !end) return 0;
      const [y1, m1, d1] = start.split('-').map(Number);
      const [y2, m2, d2] = end.split('-').map(Number);
      return Math.max(0, Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24)));
    },

    calcMenage(res) {
      if (!res || res.forceMenageNon === 'oui' || res.codeTarif === 'perso') return 0;
      return Number(this.donnees.prixMenage) || 75;
    },

    calcTaxeSejour(res) {
      if (!res || ['perso', 'black', 'booking'].includes(res.codeTarif || 'public')) return 0;
      return this.calcNights(res.dateDebut, res.dateFin) * (Number(res.nbAdulte) || 0) * (Number(this.donnees.taxeSejour) || 1.65);
    },

    calcTotalSejour(res) {
      if (!res) return 0;
      return (Number(res.prixTotal) || 0) + this.calcMenage(res) + this.calcTaxeSejour(res);
    },

    calcAcompte(res) {
      if (!res) return 0;
      const pct = (Number(this.donnees.pctAcompte) || 30) / 100;
      return Math.ceil((Number(res.prixTotal) || 0) * pct);
    },

    calcResteAPayer(res) {
      if (!res) return 0;
      const total = this.calcTotalSejour(res);
      const paye = (Number(res.acompte) || 0) + (Number(res.soldePaye) || 0);
      return Math.max(0, total - paye);
    },

    getDueDate(dateDebut) {
      if (!dateDebut) return '';
      const [y, m, d] = dateDebut.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      date.setDate(date.getDate() - 30);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    },

    formatDate(dStr) {
      if (!dStr) return '';
      const [y, m, d] = dStr.split('-');
      return `${d}/${m}/${y}`;
    },

    formatCurrency(val) {
      return (Number(val) || 0).toFixed(2) + ' €';
    },

    downloadContratPDF() {
      if (!this.reservation || this.isBooking()) return;
      
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const element = document.getElementById('pdf-contrat-template');
      const prenom = this.reservation.prenom ? this.reservation.prenom + ' ' : '';
      const fileName = `Contrat-Rocher-Saint-Pierre-${prenom}${this.reservation.nom}.pdf`;

      const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        window.scrollTo(0, originalScrollY);
      });
    },

    downloadRecapPDF() {
      if (!this.reservation || this.isBooking()) return;

      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const element = document.getElementById('pdf-recap-template');
      const prenom = this.reservation.prenom ? this.reservation.prenom + ' ' : '';
      const fileName = `Recap-Paiement-${prenom}${this.reservation.nom}.pdf`;

      const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        window.scrollTo(0, originalScrollY);
      });
    }
  }
}