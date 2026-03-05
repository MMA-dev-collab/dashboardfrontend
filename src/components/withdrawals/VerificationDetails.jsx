import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, XCircle, AlertCircle, ChevronDown, CreditCard, User, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const StatusIcon = ({ status }) => {
    switch (status) {
        case "match":
            return <CheckCircle className="w-5 h-5 text-green-500" />
        case "mismatch":
            return <XCircle className="w-5 h-5 text-red-500" />
        case "warning":
            return <AlertCircle className="w-5 h-5 text-yellow-500" />
        default:
            return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
}

const ConfidenceRing = ({ confidence }) => {
    const circumference = 2 * Math.PI * 45
    const offset = circumference - (confidence / 100) * circumference

    return (
        <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
                <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-gray-100 dark:text-gray-800"
                />
                <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 - (confidence / 100) * (2 * Math.PI * 40)}
                    strokeLinecap="round"
                    className={cn(
                        confidence >= 80 ? "text-green-500" : confidence >= 60 ? "text-yellow-500" : "text-red-500"
                    )}
                    initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 40 - (confidence / 100) * (2 * Math.PI * 40) }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
                <motion.span
                    className="text-xl font-bold"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    {Math.round(confidence)}%
                </motion.span>
                <span className="text-[10px] text-gray-400 uppercase font-medium">Score</span>
            </div>
        </div>
    )
}

const ComparisonRow = ({ field, expected, extracted, status, icon: Icon, index }) => {
    const [isExpanded, setIsExpanded] = React.useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm mb-3"
        >
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        status === 'match' ? 'bg-green-50 text-green-600' :
                            status === 'mismatch' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                    )}>
                        <Icon size={18} />
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{field}</p>
                        <p className="font-semibold text-sm">{status === 'match' ? 'Verified Match' : 'Discrepancy Found'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusIcon status={status} />
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                        <ChevronDown size={16} className="text-gray-400" />
                    </motion.div>
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20"
                    >
                        <div className="p-4 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Expected (System)</p>
                                <p className="text-sm font-medium">{expected}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Extracted (Receipt)</p>
                                <p className="text-sm font-medium text-primary">{extracted || 'Not Found'}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default function VerificationDetails({ verification, onAccept, onCancel }) {
    if (!verification) return null;

    const {
        extracted = {},
        checks = {},
        expected = {},
        verification_status,
        confidence = 0
    } = verification;

    const comparisons = [
        {
            field: "Sender Name",
            expected: expected.sender_name,
            extracted: extracted.sender_username,
            status: checks.sender_match ? "match" : "mismatch",
            icon: User
        },
        {
            field: "Receiver Name",
            expected: expected.receiver_name,
            extracted: extracted.receiver_username,
            status: checks.receiver_match ? "match" : "mismatch",
            icon: CreditCard
        },
        {
            field: "Amount",
            expected: `$${expected.amount?.toLocaleString()}`,
            extracted: `$${extracted.amount?.toLocaleString()}`,
            status: checks.amount_match ? "match" : "mismatch",
            icon: DollarSign
        }
    ];

    const overallStatus = verification_status === 'success' ? 'success' : 'failed';
    const confidenceScore = confidence > 1 ? confidence : confidence * 100;

    const statusConfig = {
        success: {
            icon: <CheckCircle className="w-8 h-8 text-white" />,
            text: "Receipt Verified",
            subtext: "AI analysis confirms all transfer details match.",
            gradient: "from-green-500 to-emerald-600",
            shadow: "shadow-green-200",
        },
        failed: {
            icon: <XCircle className="w-8 h-8 text-white" />,
            text: "Verification Issue",
            subtext: "AI detected discrepancies in transfer details.",
            gradient: "from-red-500 to-rose-600",
            shadow: "shadow-red-200",
        }
    };

    const current = statusConfig[overallStatus];

    return (
        <div className="verification-details-container w-full max-w-md mx-auto">
            <Card className="overflow-hidden border-none shadow-2xl bg-white dark:bg-gray-950">
                {/* Status Header */}
                <div className={cn("p-6 text-white bg-gradient-to-br transition-all duration-500", current.gradient, current.shadow)}>
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4 items-center">
                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl ring-1 ring-white/30">
                                {current.icon}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold m-0">{current.text}</h3>
                                <p className="text-white/80 text-xs m-0 mt-1 font-medium">{current.subtext}</p>
                            </div>
                        </div>
                        <ConfidenceRing confidence={confidenceScore} />
                    </div>
                </div>

                <CardContent className="p-6 pt-5">
                    <div className="space-y-1 mb-6">
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle size={14} className="text-primary" /> Analysis Breakdown
                        </h4>
                        <div className="h-1 w-12 bg-primary/20 rounded-full" />
                    </div>

                    <div className="comparisons-list">
                        {comparisons.map((comp, i) => (
                            <ComparisonRow key={i} index={i} {...comp} />
                        ))}
                    </div>

                    {extracted.transaction_id && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center tracking-tighter">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transaction ID</span>
                            <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300">{extracted.transaction_id}</span>
                        </div>
                    )}

                    <div className="footer-actions mt-8 flex gap-3">
                        {overallStatus === 'success' ? (
                            <Button
                                onClick={onAccept}
                                className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-100 transition-all active:scale-95"
                            >
                                Accept Results
                            </Button>
                        ) : (
                            <Button
                                onClick={onCancel}
                                variant="outline"
                                className="flex-1 h-12 font-bold rounded-xl border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all active:scale-95"
                            >
                                Go Back
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
