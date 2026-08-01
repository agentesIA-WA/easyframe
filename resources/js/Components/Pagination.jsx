import React from 'react';

const Pagination = ({ meta, onPageChange }) => {
    if (!meta || meta.last_page <= 1) return null;

    const { current_page, last_page, links } = meta;

    // Helper to filter and format links
    const getVisiblePages = () => {
        const pages = [];
        const maxVisible = 5;
        
        let start = Math.max(1, current_page - Math.floor(maxVisible / 2));
        let end = Math.min(last_page, start + maxVisible - 1);

        if (end === last_page) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6">
            <div className="flex justify-between flex-1 sm:hidden">
                <button
                    onClick={() => onPageChange(current_page - 1)}
                    disabled={current_page === 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                >
                    Anterior
                </button>
                <button
                    onClick={() => onPageChange(current_page + 1)}
                    disabled={current_page === last_page}
                    className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                >
                    Próxima
                </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-700">
                        Mostrando página <span className="font-medium">{current_page}</span> de <span className="font-medium">{last_page}</span>
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(current_page - 1)}
                            disabled={current_page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <span className="sr-only">Anterior</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                        
                        {getVisiblePages().map(page => (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    page === current_page
                                        ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                        : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => onPageChange(current_page + 1)}
                            disabled={current_page === last_page}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <span className="sr-only">Próxima</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
