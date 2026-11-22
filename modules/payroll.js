
// Tax rate: 10%
const TAX_RATE = 0.10;

// Calculate tax and net salary.
function calculate(basicSalary) {
    const tax = basicSalary * TAX_RATE;
    const net = basicSalary - tax;

    return { tax, net };
}

// Format numbers as Indian Rupees.
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

module.exports = {
    TAX_RATE,
    calculate,
    formatCurrency
};
