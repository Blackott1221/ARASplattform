import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VoiceCalls() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const makeCall = async () => {
    if (!phoneNumber) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/voice/retell/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: "Call failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#fe9100] to-orange-600 bg-clip-text text-transparent">
            ARAS Voice AI
          </h1>
          <p className="text-gray-400">Powered by Retell AI</p>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#fe9100]/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-[#fe9100]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Anruf starten</h2>
              <p className="text-sm text-gray-400">ARAS ruft deine Nummer an</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Telefonnummer</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+41 44 505 4333"
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl focus:border-[#fe9100] focus:outline-none transition-colors text-lg"
              />
            </div>

            <button
              onClick={makeCall}
              disabled={loading || !phoneNumber}
              className="w-full py-4 bg-gradient-to-r from-[#fe9100] to-orange-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-[#fe9100]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Rufe an...
                </>
              ) : (
                <>
                  <Phone className="w-6 h-6" />
                  Jetzt anrufen
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <h3 className="text-xl font-bold">
                {result.success ? "Anruf gestartet!" : "Fehler"}
              </h3>
            </div>
            
            {result.call && (
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">Call ID: <span className="text-white font-mono">{result.call.call_id}</span></p>
                <p className="text-gray-400">Status: <span className="text-green-500">{result.call.call_status}</span></p>
                <p className="text-gray-400">Agent: <span className="text-[#fe9100]">ARAS AI Global</span></p>
              </div>
            )}
            
            {result.message && !result.success && (
              <p className="text-red-400">{result.message}</p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
