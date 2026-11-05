// Dawa Smart — Reporting Engine
// Provides financial and operational report analysis using actual
// Supabase/IndexedDB data with Africa/Nairobi timezone handling.

(function () {
    'use strict';

    const TIMEZONE = 'Africa/Nairobi';

    // Helper: Convert local date to Nairobi timezone ISO string
    function toNairobiISO(date) {
        if (!date) date = new Date();
        if (typeof date === 'string') date = new Date(date);
        const iso = date.toLocaleString('sv-SE', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: 'false'
        });
        return iso.replace(' ', 'T');
    }

    // Helper: Get date range as start/end ISO strings
    function getDateRangeStartEnd(period, startDate, endDate) {
        const now = new Date();
        let start = null, end = null;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        switch (period) {
            case 'daily':
                start = todayStart;
                end = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
                break;
            case 'weekly':
                const dayOfWeek = now.getDay(); // 0 = Sunday
                const monday = new Date(now);
                monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                monday.setHours(0, 0, 0, 0);
                start = monday;
                end = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            case 'quarterly':
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1);
                end = new Date(now.getFullYear(), quarter * 3 + 3, 1);
                break;
            case 'yearly':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear() + 1, 0, 1);
                break;
            case 'custom':
                start = startDate ? new Date(startDate) : new Date(0);
                end = endDate ? new Date(endDate) : new Date();
                if (end) end.setHours(23, 59, 59, 999);
                break;
            default:
                start = new Date(0);
                end = new Date();
        }

        return {
            startISO: toNairobiISO(start),
            endISO: toNairobiISO(end),
            start,
            end
        };
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount || 0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-GB', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Helper to get pharmacy-specific sales data
    async function fetchSales(startISO, endISO, pharmacyId) {
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('sales')
                    .select('*')
                    .eq('pharmacy_id', pharmacyId)
                    .is('deleted_at', null)
                    .gte('sale_date', startISO)
                    .lte('sale_date', endISO)
                    .order('sale_date', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch (e) {
                console.error('[Reporting] Supabase sales fetch failed, falling back to local:', e);
            }
        }
        // Fallback to IndexedDB
        const allSales = await window.db.getAll('sales');
        return (allSales || []).filter(s => {
            const date = s.date || s.sale_date;
            if (!date) return false;
            return date >= startISO && date <= endISO;
        });
    }

    async function fetchSaleItems(saleId) {
        const allItems = await window.db.getAll('saleItems');
        return (allItems || []).filter(i => i.saleId === saleId || i.sale_id === saleId);
    }

    async function fetchExpenses(startISO, endISO, pharmacyId) {
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('expenses')
                    .select('*')
                    .eq('pharmacy_id', pharmacyId)
                    .is('deleted_at', null)
                    .gte('expense_date', startISO.split('T')[0])
                    .lte('expense_date', endISO.split('T')[0]);

                if (error) throw error;
                return data || [];
            } catch (e) {
                console.error('[Reporting] Supabase expenses fetch failed:', e);
            }
        }
        const allExpenses = await window.db.getAll('expenses');
        return (allExpenses || []).filter(e => {
            const date = e.date || e.expense_date;
            if (!date) return false;
            return date >= startISO && date <= endISO;
        });
    }

    async function fetchPatients(creditOnly, pharmacyId) {
        if (window.supabaseClient) {
            try {
                let query = window.supabaseClient
                    .from('patients')
                    .select('*')
                    .eq('pharmacy_id', pharmacyId)
                    .is('deleted_at', null);

                if (creditOnly) {
                    query = query.gt('credit', 0);
                }

                const { data, error } = await query;
                if (error) throw error;
                return data || [];
            } catch (e) {
                console.error('[Reporting] Supabase patients fetch failed:', e);
            }
        }
        const allPatients = await window.db.getAll('patients');
        return (allPatients || []).filter(p => !creditOnly || (p.credit && p.credit > 0));
    }

    async function fetchProducts(pharmacyId) {
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('products')
                    .select('*')
                    .eq('pharmacy_id', pharmacyId)
                    .is('deleted_at', null);
                if (error) throw error;
                return data || [];
            } catch (e) {
                console.error('[Reporting] Supabase products fetch failed:', e);
            }
        }
        return await window.db.getAll('products') || [];
    }

    async function fetchBatches(pharmacyId) {
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('batches')
                    .select('*')
                    .eq('pharmacy_id', pharmacyId)
                    .is('deleted_at', null);
                if (error) throw error;
                return data || [];
            } catch (e) {
                console.error('[Reporting] Supabase batches fetch failed:', e);
            }
        }
        return await window.db.getAll('batches') || [];
    }

    async function fetchDrugBatches(pharmacyId) {
        return await window.db.getAll('drugBatches') || [];
    }

    // Main reporting function — generates a complete report snapshot
    async function generateReport(period, startDate, endDate, reportType) {
        const range = getDateRangeStartEnd(period, startDate, endDate);
        const pharmacyId = window.DawaTenant ? window.DawaTenant.getCurrentPharmacyId() : null;
        const currentUser = window.getCurrentUser ? window.getCurrentUser() : null;

        const sales = await fetchSales(range.startISO, range.endISO, pharmacyId);
        const allSaleItemsPromises = sales.map(s => fetchSaleItems(s.id));
        const saleItemsArrays = await Promise.all(allSaleItemsPromises);
        const allSaleItems = saleItemsArrays.flat();

        const expenses = await fetchExpenses(range.startISO, range.endISO, pharmacyId);
        const products = await fetchProducts(pharmacyId);
        const batches = await fetchBatches(pharmacyId);
        const drugBatches = await fetchDrugBatches(pharmacyId);
        const patientsWithCredit = await fetchPatients(true, pharmacyId);

        // Aggregate by payment method
        const salesByMethod = {};
        let totalSales = 0;
        let cashSales = 0;
        let mpesaSales = 0;
        let cardSales = 0;
        let creditSales = 0;
        let totalCreditAmount = 0;
        let creditPaymentsReceived = 0;

        sales.forEach(sale => {
            const total = parseFloat(sale.total || sale.amount || 0);
            const method = sale.method || 'cash';
            const creditAmount = parseFloat(sale.credit_amount || 0);
            const payment = parseFloat(sale.payment || 0);

            totalSales += total;
            creditSales += creditAmount;

            if (method === 'cash' || method === 'Cash') {
                cashSales += total;
            } else if (method === 'mpesa' || method === 'mpesa') {
                mpesaSales += total;
            } else if (method === 'card' || method === 'airtel') {
                cardSales += total;
            } else if (method === 'credit') {
                creditSales += total;
            }

            if (salesByMethod[method]) {
                salesByMethod[method] += total;
            } else {
                salesByMethod[method] = total;
            }
        });

        // Calculate payments received against credit
        // (Credit payments are cash/Mpesa transactions where the sale was originally credit)
        // This is a simplified calculation — actual credit payment tracking requires a credit_payments table
        creditPaymentsReceived = sales.filter(s =>
            (s.method === 'cash' || s.method === 'mpesa') &&
            (s.credit_amount === 0 || s.credit_amount === null) &&
            s.customer && s.customer !== 'Walk-in'
        ).reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

        // Outstanding credit balances from patients
        const outstandingCredit = patientsWithCredit.reduce((sum, p) => sum + (parseFloat(p.credit || 0)), 0);

        // Cost of goods sold — use buying price from sale items
        let totalCOGS = 0;
        allSaleItems.forEach(item => {
            const qty = parseInt(item.quantity || 0);
            const buyingPrice = parseFloat(item.buying_price || item.buyingPrice || 0);
            totalCOGS += qty * buyingPrice;
        });

        // If sale_items has no buying_price, estimate from products
        const productsWithoutCost = allSaleItems.filter(item => {
            const buyingPrice = parseFloat(item.buying_price || item.buyingPrice || 0);
            return buyingPrice === 0;
        });

        if (productsWithoutCost.length > 0) {
            const productsMap = {};
            (products || []).forEach(p => { productsMap[p.id] = p; });
            productsWithoutCost.forEach(item => {
                const product = productsMap[item.productId || item.product_id];
                if (product) {
                    const buyingPrice = parseFloat(product.buying_price || product.buyingPrice || 0);
                    totalCOGS += parseInt(item.quantity || 0) * buyingPrice;
                }
            });
        }

        const grossProfit = totalSales - totalCOGS;
        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const netProfit = grossProfit - totalExpenses;

        // Best-selling medicines (by quantity sold)
        const productSales = {};
        allSaleItems.forEach(item => {
            const name = item.name || item.product_name || 'Unknown';
            if (!productSales[name]) productSales[name] = { quantity: 0, revenue: 0, cost: 0 };
            productSales[name].quantity += parseInt(item.quantity || 0);
            productSales[name].revenue += parseFloat(item.price || item.selling_price || 0) * parseInt(item.quantity || 0);
            productSales[name].cost += parseFloat(item.buying_price || item.buyingPrice || 0) * parseInt(item.quantity || 0);
        });

        const bestSellers = Object.entries(productSales)
            .sort(([, a], [, b]) => b.quantity - a.quantity)
            .slice(0, 10)
            .map(([name, data]) => ({ name, ...data, profit: data.revenue - data.cost }));

        // Most profitable medicines (by profit)
        const mostProfitable = Object.entries(productSales)
            .sort(([, a], [, b]) => (b.revenue - b.cost) - (a.revenue - a.cost))
            .slice(0, 10)
            .map(([name, data]) => ({ name, ...data, profit: data.revenue - data.cost }));

        // Sales by category
        const salesByCategory = {};
        allSaleItems.forEach(item => {
            const product = (products || []).find(p => p.id === (item.product_id || item.productId));
            const category = product ? (product.category || 'uncategorized') : 'uncategorized';
            if (!salesByCategory[category]) salesByCategory[category] = { revenue: 0, quantity: 0 };
            salesByCategory[category].revenue += parseFloat(item.price || 0) * parseInt(item.quantity || 0);
            salesByCategory[category].quantity += parseInt(item.quantity || 0);
        });

        // Sales by cashier/user
        const salesByCashier = {};
        sales.forEach(sale => {
            const cashier = sale.cashier || 'Unknown';
            if (!salesByCashier[cashier]) salesByCashier[cashier] = { revenue: 0, count: 0 };
            salesByCashier[cashier].revenue += parseFloat(sale.total || 0);
            salesByCashier[cashier].count += 1;
        });

        // Low stock products
        const lowStockProducts = (products || []).filter(p =>
            !p.deleted_at && (p.quantity || 0) <= 10 && (p.quantity || 0) > 0
        ).sort((a, b) => (a.quantity || 0) - (b.quantity || 0)).slice(0, 20);

        // Expired and near-expiry batches
        const today = new Date();
        const nearExpiryThreshold = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiredBatches = (batches || []).filter(b => {
            if (b.deleted_at) return false;
            const exp = b.expiry_date;
            return exp && new Date(exp) < today;
        });
        const nearExpiryBatches = (batches || []).filter(b => {
            if (b.deleted_at) return false;
            const exp = b.expiry_date;
            return exp && new Date(exp) >= today && new Date(exp) <= nearExpiryThreshold;
        });
        const expiredDrugBatches = (drugBatches || []).filter(b => {
            if (b.deleted_at) return false;
            const exp = b.expiry_date;
            return exp && new Date(exp) < today && (b.quantity_remaining || 0) > 0;
        });

        // Stock value
        const totalStockValue = (products || []).reduce((sum, p) =>
            sum + (parseFloat(p.buying_price || p.buyingPrice || 0) * parseInt(p.quantity || 0)), 0);

        // Daily/weekly trend data
        const salesTrend = {};
        sales.forEach(sale => {
            const date = (sale.sale_date || sale.date || '').split('T')[0] || 'unknown';
            if (!salesTrend[date]) salesTrend[date] = { revenue: 0, count: 0 };
            salesTrend[date].revenue += parseFloat(sale.total || 0);
            salesTrend[date].count += 1;
        });

        const report = {
            report_name: 'Financial Report - ' + period.charAt(0).toUpperCase() + period.slice(1),
            report_type: reportType || period,
            start_date: range.startISO.split('T')[0],
            end_date: range.endISO.split('T')[0],
            generated_by: currentUser ? (currentUser.email || currentUser.username || 'Unknown') : 'Unknown',
            generated_at: new Date().toISOString(),
            pharmacy_id: pharmacyId,

            summary: {
                total_sales: totalSales,
                cash_sales: cashSales,
                mpesa_sales: mpesaSales,
                card_sales: cardSales,
                credit_sales: creditSales,
                credit_payments_received: creditPaymentsReceived,
                outstanding_credit_balances: outstandingCredit,
                total_expenses: totalExpenses,
                cost_of_goods_sold: totalCOGS,
                gross_profit: grossProfit,
                net_profit: netProfit,
                total_stock_value: totalStockValue,
                total_transactions: sales.length,
                total_sale_items: allSaleItems.length,
                total_products: (products || []).length,
                total_patients: (await fetchPatients(false, pharmacyId)).length,
                low_stock_count: lowStockProducts.length,
                expired_batch_count: expiredBatches.concat(expiredDrugBatches).length,
                near_expiry_count: nearExpiryBatches.length
            },

            sales_by_method: salesByMethod,
            sales_by_category: salesByCategory,
            sales_by_cashier: salesByCashier,
            sales_trend: salesTrend,

            best_selling: bestSellers,
            most_profitable: mostProfitable,

            low_stock_products: lowStockProducts.map(p => ({
                id: p.id,
                name: p.name || p.sku || 'Unnamed',
                quantity: p.quantity || 0,
                buying_price: parseFloat(p.buying_price || p.buyingPrice || 0),
                selling_price: parseFloat(p.selling_price || p.price || 0)
            })),

            expired_batches: expiredBatches.concat(expiredDrugBatches).map(b => ({
                id: b.id,
                product_name: b.product_name || b.drug_name || 'Unknown',
                batch_number: b.batch_number,
                expiry_date: b.expiry_date,
                quantity_remaining: b.quantity_remaining || b.quantity || 0
            })),

            near_expiry_batches: nearExpiryBatches.map(b => ({
                id: b.id,
                product_name: b.product_name || b.drug_name || 'Unknown',
                batch_number: b.batch_number,
                expiry_date: b.expiry_date,
                days_until_expiry: b.expiry_date ? Math.ceil((new Date(b.expiry_date) - today) / (1000 * 60 * 60 * 24)) : null
            })),

            transactions: sales.map(s => ({
                id: s.id,
                date: s.sale_date || s.date,
                customer: s.customer,
                total: parseFloat(s.total || 0),
                method: s.method,
                payment: parseFloat(s.payment || 0),
                credit_amount: parseFloat(s.credit_amount || 0),
                receipt_number: s.receipt_number,
                cashier: s.cashier,
                items_count: (allSaleItems || []).filter(i => (i.sale_id || i.saleId) === s.id).length
            })),

            expenses: expenses.map(e => ({
                id: e.id,
                date: e.expense_date || e.date,
                type: e.type,
                amount: parseFloat(e.amount || 0),
                description: e.description
            })),

            patient_credit: patientsWithCredit.map(p => ({
                id: p.id,
                name: (p.first_name || '') + ' ' + (p.last_name || ''),
                phone: p.phone,
                credit: parseFloat(p.credit || 0),
                credit_limit: parseFloat(p.credit_limit || 10000)
            })),

            detail_sale_items: allSaleItems.map(item => ({
                id: item.id,
                sale_id: item.sale_id || item.saleId,
                product_id: item.product_id || item.productId,
                name: item.name || item.product_name || '',
                quantity: parseInt(item.quantity || 0),
                price: parseFloat(item.price || 0),
                buying_price: parseFloat(item.buying_price || item.buyingPrice || 0)
            }))
        };

        return report;
    }

    // Get period options for UI
    function getPeriodOptions() {
        return [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly (Mon-Sun)' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'yearly', label: 'Yearly' },
            { value: 'custom', label: 'Custom Range' }
        ];
    }

    // Save report snapshot to Supabase or IndexedDB
    async function saveReportSnapshot(report) {
        const pharmacyId = window.DawaTenant ? window.DawaTenant.getCurrentPharmacyId() : null;
        const currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
        const generatedBy = currentUser ? (currentUser.email || currentUser.username || 'Unknown') : 'Unknown';

        const archive = {
            id: 'ra_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
            report_name: report.report_name || 'Financial Report',
            report_type: report.report_type || 'sales',
            start_date: report.summary?.start_date || report.start_date,
            end_date: report.summary?.end_date || report.end_date,
            generated_by: generatedBy,
            generated_at: new Date().toISOString(),
            report_data: report,
            total_sales: report.summary?.total_sales || 0,
            cash_sales: report.summary?.cash_sales || 0,
            mpesa_sales: report.summary?.mpesa_sales || 0,
            card_sales: report.summary?.card_sales || 0,
            credit_sales: report.summary?.credit_sales || 0,
            total_expenses: report.summary?.total_expenses || 0,
            gross_profit: report.summary?.gross_profit || 0,
            net_profit: report.summary?.net_profit || 0,
            cost_of_goods_sold: report.summary?.cost_of_goods_sold || 0,
            is_deleted: false,
            pharmacy_id: pharmacyId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            revision: 0
        };

        // Save to IndexedDB
        await window.db.add('reportArchives', archive);

        // Sync to Supabase if available
        if (window.supabaseClient && window.DawaSync) {
            try {
                window.DawaSync.enqueueOperation('report_archives', 'create', archive.id, archive);
            } catch (e) {
                console.warn('[Reporting] Failed to queue report archive for sync:', e);
            }
        }

        return archive;
    }

    // Retrieve archived reports
    async function getReportArchives(filter = {}) {
        const allArchives = await window.db.getAll('reportArchives') || [];
        const pharmacyId = window.DawaTenant ? window.DawaTenant.getCurrentPharmacyId() : null;

        let filtered = allArchives.filter(a => {
            if (a.pharmacy_id !== pharmacyId && pharmacyId) return false;
            if (a.is_deleted) return false;
            if (filter.reportType && a.report_type !== filter.reportType) return false;
            if (filter.userId && a.generated_by !== filter.userId) return false;
            if (filter.startDate && a.created_at < filter.startDate) return false;
            if (filter.endDate && a.created_at > filter.endDate) return false;
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                if (!(a.report_name?.toLowerCase().includes(searchLower) ||
                      a.report_type?.toLowerCase().includes(searchLower))) return false;
            }
            return true;
        });

        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return filtered;
    }

    // Restore a historical report snapshot (does not recalculate)
    function getReportSnapshot(archiveId) {
        return window.db.getById('reportArchives', archiveId).then(archive => {
            if (!archive || archive.is_deleted) return null;
            return archive.report_data;
        });
    }

    // Soft-delete a report archive
    async function deleteReportArchive(archiveId) {
        const archive = await window.db.getById('reportArchives', archiveId);
        if (!archive) throw new Error('Report not found');
        archive.is_deleted = true;
        archive.updated_at = new Date().toISOString();
        archive.revision = (archive.revision || 0) + 1;
        return window.db.update('reportArchives', archive);
    }

    // Check for unsynced transactions
    function checkSyncStatus() {
        if (window.DawaSync && window.DawaSync.getStatus) {
            const status = window.DawaSync.getStatus();
            return {
                isOnline: navigator.onLine,
                pendingSync: status.pending || 0,
                hasUnsynced: (status.pending || 0) > 0,
                status: status.status || 'unknown'
            };
        }
        return {
            isOnline: navigator.onLine,
            pendingSync: 0,
            hasUnsynced: false,
            status: 'local-only'
        };
    }

    // Generate CSV from report data
    function generateCSV(report) {
        const lines = [];

        // Header
        lines.push('Dawa Smart Financial Report');
        lines.push('Report Type: ' + (report.report_type || 'N/A'));
        lines.push('Period: ' + (report.start_date || '') + ' to ' + (report.end_date || ''));
        lines.push('Generated: ' + new Date().toISOString());
        lines.push('');
        lines.push('=== SUMMARY ===');
        const s = report.summary;
        lines.push('Total Sales,' + formatCurrency(s.total_sales));
        lines.push('Cash Sales,' + formatCurrency(s.cash_sales));
        lines.push('M-Pesa Sales,' + formatCurrency(s.mpesa_sales));
        lines.push('Card Sales,' + formatCurrency(s.card_sales));
        lines.push('Credit Sales,' + formatCurrency(s.credit_sales));
        lines.push('Credit Payments Received,' + formatCurrency(s.credit_payments_received));
        lines.push('Outstanding Credit,' + formatCurrency(s.outstanding_credit_balances));
        lines.push('Cost of Goods Sold,' + formatCurrency(s.cost_of_goods_sold));
        lines.push('Gross Profit,' + formatCurrency(s.gross_profit));
        lines.push('Operating Expenses,' + formatCurrency(s.total_expenses));
        lines.push('Net Operating Profit,' + formatCurrency(s.net_profit));
        lines.push('Total Stock Value,' + formatCurrency(s.total_stock_value));
        lines.push('Total Transactions,' + s.total_transactions);
        lines.push('');

        lines.push('=== SALES BY METHOD ===');
        Object.entries(report.sales_by_method || {}).forEach(([method, amount]) => {
            lines.push(method + ',' + formatCurrency(amount));
        });
        lines.push('');

        lines.push('=== SALES BY CATEGORY ===');
        Object.entries(report.sales_by_category || {}).forEach(([cat, data]) => {
            lines.push(cat + ',Revenue:' + formatCurrency(data.revenue) + ',Quantity:' + data.quantity);
        });
        lines.push('');

        lines.push('=== BEST SELLING PRODUCTS ===');
        (report.best_selling || []).forEach(p => {
            lines.push(p.name + ',Qty:' + p.quantity + ',Revenue:' + formatCurrency(p.revenue) + ',Cost:' + formatCurrency(p.cost) + ',Profit:' + formatCurrency(p.profit));
        });
        lines.push('');

        lines.push('=== LOW STOCK PRODUCTS ===');
        (report.low_stock_products || []).forEach(p => {
            lines.push(p.name + ',Stock:' + p.quantity + ',Buying Price:' + formatCurrency(p.buying_price) + ',Selling Price:' + formatCurrency(p.selling_price));
        });
        lines.push('');

        lines.push('=== EXPIRED BATCHES ===');
        (report.expired_batches || []).forEach(b => {
            lines.push(b.product_name + ',Batch:' + b.batch_number + ',Expiry:' + formatDate(b.expiry_date) + ',Remaining:' + b.quantity_remaining);
        });
        lines.push('');

        lines.push('=== TRANSACTION DETAILS ===');
        lines.push('Receipt,Date,Customer,Method,Total,Payment,Credit,Status');
        (report.transactions || []).forEach(t => {
            const status = t.credit_amount > 0 ? 'Credit' : 'Paid';
            lines.push(
                (t.receipt_number || '') + ',' +
                formatDate(t.date) + ',' +
                (t.customer || '') + ',' +
                (t.method || '') + ',' +
                formatCurrency(t.total) + ',' +
                formatCurrency(t.payment) + ',' +
                formatCurrency(t.credit_amount) + ',' +
                status
            );
        });
        lines.push('');

        lines.push('=== EXPENSES ===');
        lines.push('Date,Type,Amount,Description');
        (report.expenses || []).forEach(e => {
            lines.push(formatDate(e.date) + ',' + (e.type || '') + ',' + formatCurrency(e.amount) + ',' + (e.description || ''));
        });

        return lines.join('\n');
    }

    // Generate Excel-compatible data (CSV with BOM)
    function generateExcelCSV(report) {
        return '\uFEFF' + generateCSV(report);
    }

    // Generate professional PDF report using jsPDF + AutoTable
    async function generatePDF(report, options = {}) {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            console.error('[Reporting] jsPDF not loaded');
            showToast('PDF library not loaded. Please refresh the page.', 'error');
            return null;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        // Get branding from current user
        const branding = currentUser?.customization || {};
        const pharmacyName = branding.pharmacyName || 'Dawa Smart Pharmacy';
        const pharmacyTagline = branding.tagline || 'Professional Pharmacy Management';
        const receiptFooter = branding.receiptFooter || 'Thank you for choosing us!';
        const primaryColor = branding.primaryColor || '#0b6e4f';
        const logoData = branding.logo || null;
        
        // Color parsing helper
        function hexToRgb(hex) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        }
        
        const primaryRgb = hexToRgb(primaryColor);
        
        let yPos = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - 2 * margin;

        // Helper: Draw header with branding
        function drawHeader() {
            // Background header bar
            doc.setFillColor(...primaryRgb);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            // Logo placeholder
            if (logoData) {
                try {
                    doc.addImage(logoData, 'PNG', margin, 5, 25, 25);
                } catch (e) {
                    console.warn('Could not add logo to PDF:', e);
                }
            }
            
            // Pharmacy name
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            const logoOffset = logoData ? 35 : margin;
            doc.text(pharmacyName.toUpperCase(), logoOffset, 15);
            
            // Tagline
            if (branding.tagline) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(branding.tagline, logoOffset, 22);
            }
            
            // Address
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('7 Cheptais · 📞 0759324463', logoOffset, 28);
            
            // KRA PIN
            doc.text('KRA PIN: P-2025-001', logoOffset, 32);
            
            yPos = 42;
        }

        // Helper: Draw section title
        function drawSectionTitle(title) {
            doc.setFillColor(...primaryRgb);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin + 2, yPos + 5.5);
            yPos += 12;
        }

        // Helper: Check page break
        function checkPageBreak(neededSpace) {
            if (yPos + neededSpace > pageHeight - 20) {
                doc.addPage();
                yPos = 15;
            }
        }

        // Helper: Format currency
        function fmtCurrency(amount) {
            return new Intl.NumberFormat('en-KE', {
                style: 'currency',
                currency: 'KES',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount || 0);
        }

        // Start PDF generation
        drawHeader();

        // Report title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(report.report_name || 'Financial Report', margin, yPos);
        yPos += 8;

        // Period info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const periodText = `Period: ${report.start_date} to ${report.end_date} | Generated: ${new Date().toLocaleDateString('en-GB')}`;
        doc.text(periodText, margin, yPos);
        yPos += 12;

        // Generated by
        doc.setFontSize(8);
        doc.text(`Generated by: ${report.generated_by || 'Unknown'} | ${new Date().toLocaleString('en-GB')}`, margin, yPos);
        yPos += 10;

        // Line separator
        doc.setDrawColor(...primaryRgb);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // ===== SUMMARY SECTION =====
        drawSectionTitle('FINANCIAL SUMMARY');

        const s = report.summary || {};
        const summaryData = [
            ['Metric', 'Amount'],
            ['Total Sales', fmtCurrency(s.total_sales || 0)],
            ['Cash Sales', fmtCurrency(s.cash_sales || 0)],
            ['M-Pesa Sales', fmtCurrency(s.mpesa_sales || 0)],
            ['Card Sales', fmtCurrency(s.card_sales || 0)],
            ['Credit Sales', fmtCurrency(s.credit_sales || 0)],
            ['Credit Payments Received', fmtCurrency(s.credit_payments_received || 0)],
            ['Outstanding Credit', fmtCurrency(s.outstanding_credit_balances || 0)],
            ['Cost of Goods Sold (COGS)', fmtCurrency(s.cost_of_goods_sold || 0)],
            ['Gross Profit', fmtCurrency(s.gross_profit || 0)],
            ['Operating Expenses', fmtCurrency(s.total_expenses || 0)],
            ['Net Operating Profit', fmtCurrency(s.net_profit || 0)],
            ['Total Stock Value', fmtCurrency(s.total_stock_value || 0)],
            ['Total Transactions', (s.total_transactions || 0).toString()],
            ['Total Sale Items', (s.total_sale_items || 0).toString()],
            ['Total Products', (s.total_products || 0).toString()],
            ['Low Stock Count', (s.low_stock_count || 0).toString()],
            ['Expired Batches', (s.expired_batch_count || 0).toString()],
            ['Near Expiry Batches', (s.near_expiry_count || 0).toString()],
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Amount']],
            body: summaryData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 60 } },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // ===== SALES BY METHOD =====
        checkPageBreak(60);
        drawSectionTitle('SALES BY PAYMENT METHOD');

        const methodData = Object.entries(report.sales_by_method || {}).map(([method, amount]) => [
            method.charAt(0).toUpperCase() + method.slice(1),
            fmtCurrency(amount)
        ]);

        if (methodData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Payment Method', 'Amount']],
                body: methodData,
                theme: 'striped',
                headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right', cellWidth: 60 } },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // ===== SALES BY CATEGORY =====
        checkPageBreak(60);
        drawSectionTitle('SALES BY CATEGORY');

        const categoryData = Object.entries(report.sales_by_category || {}).map(([cat, data]) => [
            cat.charAt(0).toUpperCase() + cat.slice(1),
            fmtCurrency(data.revenue || 0),
            data.quantity || 0
        ]);

        if (categoryData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Category', 'Revenue', 'Qty Sold']],
                body: categoryData,
                theme: 'striped',
                headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 60 }, 1: { halign: 'right', cellWidth: 50 }, 2: { halign: 'center', cellWidth: 30 } },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // ===== BEST SELLING PRODUCTS =====
        checkPageBreak(80);
        drawSectionTitle('TOP 10 BEST SELLING PRODUCTS');

        const bestSellerData = (report.best_selling || []).slice(0, 10).map((p, i) => [
            i + 1,
            p.name,
            p.quantity.toString(),
            fmtCurrency(p.revenue || 0),
            fmtCurrency(p.cost || 0),
            fmtCurrency(p.profit || 0)
        ]);

        if (bestSellerData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['#', 'Product Name', 'Qty Sold', 'Revenue', 'Cost', 'Profit']],
                body: bestSellerData,
                theme: 'striped',
                headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 8 },
                bodyStyles: { fontSize: 7 },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { cellWidth: 55 }, 2: { halign: 'center', cellWidth: 15 }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 30 }, 5: { halign: 'right', cellWidth: 30 } },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // ===== LOW STOCK PRODUCTS =====
        checkPageBreak(60);
        drawSectionTitle('LOW STOCK PRODUCTS (Qty ≤ 10)');

        const lowStockData = (report.low_stock_products || []).slice(0, 15).map(p => [
            p.name,
            p.quantity.toString(),
            fmtCurrency(p.buying_price || 0),
            fmtCurrency(p.selling_price || 0)
        ]);

        if (lowStockData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Product', 'Qty', 'Buying Price', 'Selling Price']],
                body: lowStockData,
                theme: 'striped',
                headStyles: { fillColor: [220, 53, 69], textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 40 }, 3: { halign: 'right', cellWidth: 40 } },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // ===== EXPIRED / NEAR EXPIRY BATCHES =====
        checkPageBreak(60);
        drawSectionTitle('EXPIRED & NEAR EXPIRY BATCHES');

        const expiredData = (report.expired_batches || []).slice(0, 10).map(b => [
            b.product_name,
            b.batch_number,
            b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-GB') : 'N/A',
            b.quantity_remaining.toString()
        ]);

        const nearExpiryData = (report.near_expiry_batches || []).slice(0, 10).map(b => [
            b.product_name,
            b.batch_number,
            b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-GB') : 'N/A',
            b.days_until_expiry ? b.days_until_expiry + ' days' : 'N/A',
            b.quantity_remaining.toString()
        ]);

        if (expiredData.length > 0 || nearExpiryData.length > 0) {
            if (expiredData.length > 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(220, 53, 69);
                doc.text('EXPIRED BATCHES', margin, yPos);
                yPos += 6;
                
                doc.autoTable({
                    startY: yPos,
                    head: [['Product', 'Batch #', 'Expiry Date', 'Qty Remaining']],
                    body: expiredData,
                    theme: 'striped',
                    headStyles: { fillColor: [220, 53, 69], textColor: 255, fontSize: 8 },
                    bodyStyles: { fontSize: 7 },
                    margin: { left: margin, right: margin },
                    tableWidth: contentWidth,
                });
                yPos = doc.lastAutoTable.finalY + 8;
            }

            if (nearExpiryData.length > 0) {
                checkPageBreak(40);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(245, 158, 11);
                doc.text('NEAR EXPIRY (30 DAYS)', margin, yPos);
                yPos += 6;
                
                doc.autoTable({
                    startY: yPos,
                    head: [['Product', 'Batch #', 'Expiry Date', 'Days Left', 'Qty Remaining']],
                    body: nearExpiryData,
                    theme: 'striped',
                    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 8 },
                    bodyStyles: { fontSize: 7 },
                    margin: { left: margin, right: margin },
                    tableWidth: contentWidth,
                });
                yPos = doc.lastAutoTable.finalY + 10;
            }
        }

        // ===== TOP TRANSACTIONS =====
        checkPageBreak(80);
        drawSectionTitle('RECENT TRANSACTIONS (Latest 20)');

        const txnData = (report.transactions || []).slice(0, 20).map(t => [
            t.receipt_number || t.id,
            t.date ? new Date(t.date).toLocaleDateString('en-GB') : 'N/A',
            t.customer || 'Walk-in',
            t.method?.toUpperCase() || 'CASH',
            fmtCurrency(t.total || 0),
            fmtCurrency(t.payment || 0),
            t.credit_amount > 0 ? fmtCurrency(t.credit_amount) : '-',
            t.credit_amount > 0 ? 'Credit' : 'Paid'
        ]);

        if (txnData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Receipt #', 'Date', 'Customer', 'Method', 'Total', 'Payment', 'Credit', 'Status']],
                body: txnData,
                theme: 'striped',
                headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 7 },
                bodyStyles: { fontSize: 6 },
                columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 2: { cellWidth: 30 }, 3: { cellWidth: 20 }, 4: { halign: 'right', cellWidth: 25 }, 5: { halign: 'right', cellWidth: 25 }, 6: { halign: 'center', cellWidth: 20 }, 7: { halign: 'center', cellWidth: 20 } },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // ===== EXPENSES =====
        checkPageBreak(60);
        drawSectionTitle('EXPENSES');

        const expenseData = (report.expenses || []).slice(0, 15).map(e => [
            e.date ? new Date(e.date).toLocaleDateString('en-GB') : 'N/A',
            e.type || 'General',
            fmtCurrency(e.amount || 0),
            e.description || '-'
        ]);

        if (expenseData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Date', 'Type', 'Amount', 'Description']],
                body: expenseData,
                theme: 'striped',
                headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 30 }, 2: { halign: 'right', cellWidth: 30 }, 3: { cellWidth: 95 } },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // ===== PATIENT CREDITS =====
        checkPageBreak(60);
        drawSectionTitle('OUTSTANDING PATIENT CREDITS');

        const creditData = (report.patient_credit || []).slice(0, 15).map(p => [
            p.name,
            p.phone || '-',
            fmtCurrency(p.credit || 0),
            fmtCurrency(p.credit_limit || 0)
        ]);

        if (creditData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Patient Name', 'Phone', 'Credit', 'Limit']],
                body: creditData,
                theme: 'striped',
                headStyles: { fillColor: primaryRgb, textColor: 255, fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 30 } },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // ===== FOOTER =====
        checkPageBreak(30);
        yPos += 5;
        doc.setDrawColor(...primaryRgb);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(receiptFooter, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
        doc.text('Dawa Smart - Professional Pharmacy Management', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
        doc.text(`Report generated on ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, yPos, { align: 'center' });

        // Save PDF
        const fileName = `DawaSmart_${report.report_type || 'Report'}_${report.start_date}_to_${report.end_date}.pdf`;
        doc.save(fileName);
        
        return doc;
    }

    // Public API
    window.DawaReporting = {
        generateReport: generateReport,
        saveReportSnapshot: saveReportSnapshot,
        getReportArchives: getReportArchives,
        getReportSnapshot: getReportSnapshot,
        deleteReportArchive: deleteReportArchive,
        getPeriodOptions: getPeriodOptions,
        getDateRange: getDateRangeStartEnd,
        formatCurrency: formatCurrency,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        escapeHtml: escapeHtml,
        generateCSV: generateCSV,
        generateExcelCSV: generateExcelCSV,
        checkSyncStatus: checkSyncStatus,
        toNairobiISO: toNairobiISO,
        TIMEZONE: TIMEZONE
    };
})();
