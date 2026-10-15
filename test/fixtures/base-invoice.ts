import { Customer } from './customer.js'

export class BaseInvoice
{

	customer?: Customer
	number:    string = 'inherited'

	constructor()
	{
		throw new Error('Metadata must not construct records')
	}

}
