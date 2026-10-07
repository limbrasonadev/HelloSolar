
        (() => {
            function bindDialog(modalId, closeBtnId, cancelBtnId, openerId) {
                const modal = document.getElementById(modalId);
                const opener = openerId ? document.getElementById(openerId) : null;
                const close = closeBtnId ? document.getElementById(closeBtnId) : null;
                const cancel = cancelBtnId ? document.getElementById(cancelBtnId) : null;
                let previousOverflow = '';
                let previousPaddingRight = '';

                if (opener && modal) {
                    opener.addEventListener('click', () => {
                        if (modal.open) return;
                        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                        previousOverflow = document.body.style.overflow;
                        previousPaddingRight = document.body.style.paddingRight;
                        if (scrollbarWidth > 0) {
                            document.body.style.paddingRight = `${scrollbarWidth}px`;
                        }
                        modal.showModal();
                        document.body.style.overflow = 'hidden';
                    });
                }

                if (close && modal) {
                    close.addEventListener('click', () => modal.close());
                }
                if (cancel && modal) {
                    cancel.addEventListener('click', () => modal.close());
                }

                if (modal) {
                    modal.addEventListener('click', (event) => {
                        const rect = modal.getBoundingClientRect();
                        if (event.target === modal && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) {
                            modal.close();
                        }
                    });
                    modal.addEventListener('close', () => {
                        document.body.style.overflow = previousOverflow;
                        document.body.style.paddingRight = previousPaddingRight;
                        if (opener) opener.focus();
                    });
                }
            }

            bindDialog('paymentHistoryModal', 'closePaymentHistoryBtn', null, 'openPaymentHistoryBtn');
            bindDialog('submitPaymentProofModal', 'closeProofModalBtn', 'modalCancelProofBtn', null);
        })();
    