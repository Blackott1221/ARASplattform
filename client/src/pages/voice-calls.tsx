import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneCall, Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VoiceCalls() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSingleCall = async () => {
    if (!phoneNumber) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/voice/outbound/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, campaignMessage: message })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: "Failed to initiate call" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCall = async () => {
    const numbers = bulkNumbers.split("\n").filter(n => n.trim());
    if (numbers.length === 0) return;
    
    setBulkLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/voice/outbound/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumbers: numbers, campaignMessage: message })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: "Failed to initiate bulk calls" });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#fe9100] to-orange-600 bg-clip-text text-transparent">
            Voice AI Calling
          </h1>
          <p className="text-gray-400">ARAS AI ruft deine Kunden an</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Call */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#fe9100]/20 flex items-center justify-center">
                <Phone className="w-6 h-6 text-[#fe9100]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Einzelanruf</h2>
                <p className="text-sm text-gray-400">Eine Nummer anrufen</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Telefonnummer</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+49 123 456789"
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl focus:border-[#fe9100] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nachricht (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hallo, hier ist ARAS AI..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl focus:border-[#fe9100] focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                onClick={handleSingleCall}
                disabled={loading || !phoneNumber}
                className="w-full py-3 bg-gradient-to-r from-[#fe9100] to-orange-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#fe9100]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Rufe an...
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-5 h-5" />
                    Anrufen
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Bulk Call */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#fe9100]/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-[#fe9100]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Bulk Calling</h2>
                <p className="text-sm text-gray-400">Mehrere Nummern</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Telefonnummern (eine pro Zeile)</label>
                <textarea
                  value={bulkNumbers}
                  onChange={(e) => setBulkNumbers(e.target.value)}
                  placeholder="+49 123 456789&#10;+49 987 654321&#10;+49 111 222333"
                  rows={5}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl focus:border-[#fe9100] focus:outline-none transition-colors resize-none font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kampagnen-Nachricht</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hallo, hier ist ARAS AI..."
                  rows={2}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl focus:border-[#fe9100] focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                onClick={handleBulkCall}
                disabled={bulkLoading || !bulkNumbers.trim()}
                className="w-full py-3 bg-gradient-to-r from-[#fe9100] to-orange-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#fe9100]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Rufe an...
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-5 h-5" />
                    Bulk Anrufen
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              Ergebnis
            </h3>
            
            {result.results ? (
              <div className="space-y-2">
                <p className="text-gray-400">
                  Erfolgreich: {result.successful} / {result.total}
                </p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {result.results.map((r: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        r.success
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-red-500/10 border-red-500/30"
                      }`}
                    >
                      <p className="font-mono text-sm">{r.phoneNumber}</p>
                      <p className="text-xs text-gray-400">
                        {r.success ? `Call SID: ${r.callSid}` : `Error: ${r.error}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400">{JSON.stringify(result, null, 2)}</p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
