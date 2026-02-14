import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  HelpCircle, 
  Book, 
  Mail, 
  MessageCircle, 
  FileText, 
  Video, 
  Phone,
  ChevronRight,
  Search,
  Send
} from 'lucide-react';

const Help: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  const helpCategories = [
    {
      id: 'getting-started',
      title: 'Empezar a Usar',
      icon: Book,
      description: 'Guías básicas para comenzar',
      articles: [
        'Cómo crear tu primera cuenta',
        'Agregar tu primera transacción',
        'Configurar tus categorías',
        'Entender el dashboard'
      ]
    },
    {
      id: 'features',
      title: 'Funcionalidades',
      icon: FileText,
      description: 'Aprende a usar todas las herramientas',
      articles: [
        'Reportes y exportación',
        'Configuración de alertas',
        'Modo oscuro y preferencias',
        'Gestión de cuentas'
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Solución de Problemas',
      icon: Search,
      description: 'Resuelve issues comunes',
      articles: [
        'No puedo iniciar sesión',
        'Error al guardar datos',
        'Problemas de sincronización',
        'Restablecer contraseña'
      ]
    },
    {
      id: 'security',
      title: 'Seguridad',
      icon: Phone,
      description: 'Protege tu información',
      articles: [
        'Configuración de privacidad',
        'Exportar tus datos',
        'Eliminar tu cuenta',
        'Buenas prácticas de seguridad'
      ]
    }
  ];

  const faqs = [
    {
      question: '¿Cómo cambio mi contraseña?',
      answer: 'Puedes cambiar tu contraseña desde la página de perfil. Haz clic en "Editar perfil" y luego en "Cambiar contraseña". Recibirás un email de confirmación.'
    },
    {
      question: '¿Puedo exportar mis datos?',
      answer: 'Sí, puedes exportar todos tus datos en formato Excel desde la página de Ajustes. Ve a "Exportar datos" y selecciona el tipo de reporte que necesitas.'
    },
    {
      question: '¿Cómo funcionan las alertas por email?',
      answer: 'Las alertas por email te notifican sobre eventos importantes como balances bajos o gastos inusualmente altos. Actívalas en Ajustes > Notificaciones.'
    },
    {
      question: '¿Mis datos están seguros?',
      answer: 'Sí, todos tus datos están encriptados y almacenados de forma segura. Además, puedes exportarlos o eliminarlos en cualquier momento desde la sección de privacidad.'
    },
    {
      question: '¿Cómo elimino mi cuenta?',
      answer: 'Para eliminar tu cuenta, ve a Ajustes > Privacidad y Seguridad > "Solicitar eliminación de datos". Este proceso es irreversible.'
    },
    {
      question: '¿Puedo usar la aplicación sin conexión?',
      answer: 'Sí, la aplicación funciona offline y sincronizará tus datos cuando vuelvas a tener conexión a internet.'
    }
  ];

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (supportMessage.trim()) {
      const subject = encodeURIComponent('Soporte Spendo');
      const body = encodeURIComponent(supportMessage.trim());
      window.location.href = `mailto:soporte@finanzasapp.com?subject=${subject}&body=${body}`;
      setMessageSent(true);
      setSupportMessage('');
      setTimeout(() => setMessageSent(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Ayuda y Soporte
        </h1>
        <p className={`mt-1 transition-colors ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Encuentra respuestas y obtén ayuda cuando la necesites
        </p>
      </div>

      {/* Búsqueda */}
      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} size={20} />
          <input
            type="text"
            placeholder="Buscar ayuda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all duration-200 ${
              isDarkMode
                ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
          />
        </div>
      </div>

      {/* Categorías de Ayuda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up">
        {helpCategories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 text-left card-surface ${
                isDarkMode
                  ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700 hover:border-blue-600'
                  : 'bg-white border-gray-200 hover:border-blue-500'
              } ${selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl transition-colors ${
                  isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                }`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {category.title}
                  </h3>
                  <p className={`text-sm mb-3 transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {category.description}
                  </p>
                  
                  {selectedCategory === category.id && (
                    <div className="space-y-2">
                      {category.articles.map((article, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                            isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <span className={`text-sm transition-colors ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {article}
                          </span>
                          <ChevronRight size={16} className={
                            isDarkMode ? 'text-gray-500' : 'text-gray-400'
                          } />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preguntas Frecuentes */}
      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-4 flex items-center transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          <HelpCircle className="mr-2" size={24} />
          Preguntas Frecuentes
        </h2>
        
        <div className="space-y-3">
          {filteredFAQs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-xl transition-all duration-300 ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                className={`w-full p-4 text-left flex items-center justify-between transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`font-medium transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {faq.question}
                </span>
                <ChevronRight
                  size={20}
                  className={`transition-transform duration-200 ${
                    expandedFAQ === index ? 'rotate-90' : ''
                  } ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                />
              </button>
              
              {expandedFAQ === index && (
                <div className={`px-4 pb-4 transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contacto de Soporte */}
      <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-300 card-surface ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-4 flex items-center transition-colors ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          <MessageCircle className="mr-2" size={24} />
          Contacto de Soporte
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <a
            href="mailto:soporte@finanzasapp.com"
            className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
              isDarkMode
                ? 'bg-gray-700/50 hover:bg-gray-700 text-white'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
            }`}
          >
            <Mail size={20} />
            <div>
              <div className="font-medium">Email</div>
              <div className="text-sm opacity-75">soporte@finanzasapp.com</div>
            </div>
          </a>
          
          <a
            href="tel:+1234567890"
            className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
              isDarkMode
                ? 'bg-gray-700/50 hover:bg-gray-700 text-white'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
            }`}
          >
            <Phone size={20} />
            <div>
              <div className="font-medium">Teléfono</div>
              <div className="text-sm opacity-75">+1 234 567 890</div>
            </div>
          </a>
          
          <a
            href="mailto:soporte@finanzasapp.com?subject=Solicitud%20de%20Videollamada"
            className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
              isDarkMode
                ? 'bg-gray-700/50 hover:bg-gray-700 text-white'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
            }`}
          >
            <Video size={20} />
            <div>
              <div className="font-medium">Video Llamada</div>
              <div className="text-sm opacity-75">Agendar ahora</div>
            </div>
          </a>
        </div>
        
        {/* Formulario de mensaje rápido */}
        <div className={`p-4 rounded-xl transition-colors ${
          isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
        }`}>
          <h3 className={`font-medium mb-3 transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Envíanos un mensaje
          </h3>
          <div className="flex space-x-3">
            <textarea
              placeholder="Describe tu problema o pregunta..."
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              className={`flex-1 p-3 rounded-lg resize-none transition-colors ${
                isDarkMode
                  ? 'bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500'
              }`}
              rows={3}
            />
            <button
              onClick={handleSendMessage}
              disabled={!supportMessage.trim() || messageSent}
              className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                messageSent
                  ? 'bg-green-600 text-white'
                  : supportMessage.trim()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Send size={16} />
              <span>{messageSent ? 'Enviado' : 'Enviar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
