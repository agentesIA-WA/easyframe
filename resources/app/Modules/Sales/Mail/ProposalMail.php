<?php

namespace App\Modules\Sales\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProposalMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $text, public string $content)
    {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Proposta Comercial - Casa da Moldura',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'sales::emails.proposal',
        );
    }
}
